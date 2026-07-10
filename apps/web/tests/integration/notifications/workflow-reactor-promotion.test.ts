import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { enqueueNotifications } from "~/server/notifications/intent/enqueue";
import { parseNotificationChannels } from "~/server/notifications/intent/payload";
import type { NotificationIntent } from "~/server/notifications/types";
import { openSession } from "~/server/notifications/whatsapp-session";
import { asEventId } from "~/server/shared/ids";
import { reactToFulfillmentChanges } from "~/server/workflow/effects/reactors/fulfillment-notify";
import { reactToStageChanges } from "~/server/workflow/effects/reactors/notify";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

import { createTestNotificationRuntime } from "../../support/integration/notification-runtime";
import { createNotificationReader } from "../../support/readers/notifications";

const NOW_MS = 1_700_000_000_000;
const NOW = new Date(NOW_MS);

describe("workflow notification pipeline", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("workflow-notification-pipeline");
  }, 30_000);

  afterAll(async () => {
    await runtime.dispose();
  }, 30_000);

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(NOW);
  });

  it("persists the actual stage reactor intent and plans WhatsApp delivery", async () => {
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "setup",
      key: "ready-for-sale",
    });
    await runtime.ctx.repos.userChannelAddresses.upsert({
      user_id: actorBy("execOne").userId,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: true,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    await openSession(runtime.ctx.db, actorBy("execOne").userId, NOW);

    const committed: CommittedLeadEvent[] = [
      {
        id: asEventId("event-ready-for-sale"),
        event: {
          leadId: lead.id,
          eventType: "workflow_stage_changed",
          actorUserId: actorBy("execOne").userId,
          subjectUserId: null,
          payload: { from: "PRICING", to: "SETUP" },
          changes: [],
          occurredAt: NOW,
        },
      },
    ];

    await reactToStageChanges(runtime.ctx.db, committed, NOW);

    const reader = createNotificationReader(runtime);
    const [entry] = await reader.intents();
    if (!entry) throw new Error("expected stage notification outbox entry");
    expect(entry).toMatchObject({
      event_type: "lead.ready_for_sale",
      queue_state: "pending",
    });
    expect(parseNotificationChannels(entry.channels_json)).toEqual([
      "in_app",
      "whatsapp",
    ]);

    const notifications = createTestNotificationRuntime(runtime);
    const planned = await notifications.planIntentRow(entry, NOW);
    expect(planned.inAppRecipients).toEqual([actorBy("execOne").userId]);
    expect(planned.externalDeliveries).toEqual([
      {
        userId: actorBy("execOne").userId,
        channel: "whatsapp",
        recipientAddress: "51911000001",
      },
    ]);

    await notifications.drain();

    const [delivery] = await reader.deliveries();
    expect(delivery).toMatchObject({
      intent_id: entry.id,
      user_id: actorBy("execOne").userId,
      channel: "whatsapp",
      recipient_address: "51911000001",
      queue_state: "done",
      provider: "whatsapp_cloud",
      provider_message_id: "test-whatsapp",
      sent_at: NOW,
    });
  });

  it("persists payment URLs produced by the fulfillment reactor", async () => {
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "fulfillment",
      key: "payment-ready",
      step: "AWAITING_PAYMENT",
    });
    const orderId = lead.fulfillmentOrderId;
    if (!orderId) throw new Error("expected fulfillment order id");

    await runtime.ctx.db
      .insertInto("lead_fulfillment_units")
      .values({
        order_id: orderId,
        venue_id: lead.venueIds[0],
        label: "POS #1",
        serial_number: null,
        payment_url: "https://pay.example.com/abc",
        payment_proof_file_asset_id: null,
        payment_validated: false,
        service_a_ref: null,
        created_at: NOW,
      })
      .execute();

    await reactToFulfillmentChanges(
      runtime.ctx.db,
      [
        {
          id: asEventId("event-payment-ready"),
          event: {
            leadId: lead.id,
            eventType: "fulfillment_step_advanced",
            actorUserId: actorBy("backOne").userId,
            subjectUserId: null,
            payload: {
              orderId,
              from: "AWAITING_PAYMENT_LINK",
              to: "AWAITING_PAYMENT",
              action: "upload_payment_proof",
            },
            changes: [],
            occurredAt: NOW,
          },
        },
      ],
      NOW,
    );

    const [entry] = await createNotificationReader(runtime).intents();
    if (!entry)
      throw new Error("expected fulfillment notification outbox entry");
    expect(entry.event_type).toBe("lead.fulfillment_handoff");
    expect(entry.body_text).toContain("https://pay.example.com/abc");
    expect(parseNotificationChannels(entry.channels_json)).toEqual([
      "in_app",
      "whatsapp",
    ]);
  });

  it("plans an in-app-only intent without inventing external deliveries", async () => {
    const intent: NotificationIntent = {
      id: "in-app-only",
      eventType: "lead.ready_for_quotation",
      audience: {
        kind: "branch_role",
        branchId: actorBy("backOne").branchId,
        role: "back_office",
      },
      channels: ["in_app"],
      priority: "normal",
      title: "Cliente listo para tarifa",
      bodyText: "El cliente está listo para proponer tarifa",
      actionUrl: null,
    };
    await enqueueNotifications(runtime.ctx.db, [intent], NOW);

    const [entry] = await createNotificationReader(runtime).intents();
    if (!entry) throw new Error("expected in-app notification outbox entry");
    const notifications = createTestNotificationRuntime(runtime);
    const planned = await notifications.planIntentRow(entry, NOW);

    expect(planned.inAppRecipients).toEqual([actorBy("backOne").userId]);
    expect(planned.externalDeliveries).toEqual([]);

    await notifications.drain();

    const reader = createNotificationReader(runtime);
    expect(await reader.appNotifications()).toEqual([
      {
        user_id: actorBy("backOne").userId,
        event_type: "lead.ready_for_quotation",
        source_event_id: "in-app-only",
      },
    ]);
    expect(await reader.deliveries()).toEqual([]);
  });
});
