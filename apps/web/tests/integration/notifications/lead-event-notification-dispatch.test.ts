import { expectOk } from "@tests/support/_core/assertions";
import {
  actorBy,
  createLeadFixtureWriter,
} from "@tests/support/database/workflow-fixtures";
import { createTestNotificationRuntime } from "@tests/support/integration/notification-runtime";
import { proposePendingRate } from "@tests/support/integration/pricing";
import { operationAt } from "@tests/support/operation";
import { createNotificationReader } from "@tests/support/readers/notifications";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { parseNotificationChannels } from "~/server/notifications/intent/payload";
import { openSession } from "~/server/notifications/whatsapp-session";

const NOW = new Date(1_700_000_000_000);

describe("lead event notification dispatch", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("lead-event-notification-dispatch");
  }, 30_000);

  afterAll(async () => {
    await runtime.dispose();
  }, 30_000);

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(NOW);
  });

  it("dispatches a WhatsApp handoff to the executive when accept-rate moves the lead to SETUP", async () => {
    const executive = actorBy("execOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "pricing",
      proposal: "none",
      key: "accept-rate-dispatch",
      organization: { key: "accept-rate-dispatch" },
    });

    const { proposalId } = await proposePendingRate(runtime, {
      leadId: lead.id,
      backOffice: actorBy("backOne"),
    });

    await runtime.ctx.repos.userChannelAddresses.upsert({
      user_id: executive.userId,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: true,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });

    // Session expiry uses wall-clock time, not the simulated workflow clock.
    await openSession(runtime.ctx.db, executive.userId, new Date());

    expectOk(
      await runtime.workflow.commands.acceptRate(
        { actor: executive, leadId: lead.id, proposalId },
        operationAt(runtime.now.get()),
      ),
    );

    const reader = createNotificationReader(runtime);
    const [intent] = await reader.intents();

    if (!intent) {
      throw new Error("expected a stage notification outbox entry");
    }

    expect(intent).toMatchObject({
      event_type: "lead.ready_for_sale",
      queue_state: "pending",
    });

    expect(parseNotificationChannels(intent.channels_json)).toEqual([
      "in_app",
      "whatsapp",
    ]);

    const notificationRuntime = createTestNotificationRuntime(runtime);
    const plan = await notificationRuntime.planIntentRow(intent, NOW);

    expect(plan.inAppRecipients).toEqual([executive.userId]);
    expect(plan.externalDeliveries).toEqual([
      {
        userId: executive.userId,
        channel: "whatsapp",
        recipientAddress: "51911000001",
      },
    ]);

    await notificationRuntime.drain();

    const [delivery] = await reader.deliveries();

    expect(delivery).toMatchObject({
      intent_id: intent.id,
      user_id: executive.userId,
      channel: "whatsapp",
      queue_state: "done",
    });
  });

  it("dispatches an in-app-only notice to every back-office user in the branch when review moves the lead to PRICING", async () => {
    const backOffice = actorBy("backOne");
    const lead = await createLeadFixtureWriter(runtime)({
      kind: "qualifying",
      key: "review-dispatch",
      organization: { key: "review-dispatch" },
    });

    expectOk(
      await runtime.workflow.commands.reviewLead(
        {
          actor: backOffice,
          leadId: lead.id,
          status: "DISPONIBLE",
          priority: "P1",
          reason: "Disponible para cotizar",
        },
        operationAt(runtime.now.get()),
      ),
    );

    const reader = createNotificationReader(runtime);
    const [intent] = await reader.intents();

    if (!intent) {
      throw new Error("expected a stage notification outbox entry");
    }

    expect(intent.event_type).toBe("lead.ready_for_quotation");
    expect(parseNotificationChannels(intent.channels_json)).toEqual(["in_app"]);

    const notificationRuntime = createTestNotificationRuntime(runtime);
    const plan = await notificationRuntime.planIntentRow(intent, NOW);

    expect(plan.inAppRecipients).toEqual([backOffice.userId]);
    expect(plan.externalDeliveries).toEqual([]);

    await notificationRuntime.drain();

    expect(await reader.appNotifications()).toEqual([
      {
        user_id: backOffice.userId,
        event_type: "lead.ready_for_quotation",
        intent_id: intent.id,
      },
    ]);

    expect(await reader.deliveries()).toEqual([]);
  });
});
