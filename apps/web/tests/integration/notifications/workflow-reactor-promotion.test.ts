import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { planDeliveries } from "~/server/notifications/delivery-planner";
import { enqueueNotifications } from "~/server/notifications/outbox";
import type { NotificationIntent } from "~/server/notifications/types";
import { openSession } from "~/server/notifications/whatsapp-session";

const NOW = 1_700_000_000_000;

function makeIntent(input: {
  id: string;
  eventType: string;
  channels: NotificationIntent["channels"];
  recipientUserId: number;
}): NotificationIntent {
  return {
    id: input.id,
    eventType: input.eventType,
    audience: { kind: "user_ids", userIds: [input.recipientUserId] },
    channels: input.channels,
    priority: "high",
    title: `title ${input.id}`,
    bodyText: `body ${input.id}`,
    actionUrl: null,
  };
}

describe("notification planner — workflow reactor promotion", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("workflow-reactor-promotion");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("schedules a WhatsApp delivery for lead.ready_for_sale when the executive has a verified address and active session", async () => {
    // Seed: user 1 (executive) with a verified WhatsApp address and an active session.
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 1,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: 1,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    await openSession(ctx.db, 1, NOW);

    const intent = makeIntent({
      id: "evt-ready-for-sale",
      eventType: "lead.ready_for_sale",
      channels: ["in_app", "whatsapp"],
      recipientUserId: 1,
    });
    await enqueueNotifications(ctx.db, [intent], NOW);

    const entry = await ctx.db
      .selectFrom("notification_outbox")
      .selectAll()
      .where("id", "=", intent.id)
      .executeTakeFirstOrThrow();

    const planned = await planDeliveries(
      ctx.db,
      {
        id: entry.id,
        event_type: entry.event_type,
        audience_json: entry.audience_json,
        channels_json: entry.channels_json,
      },
      NOW,
    );

    expect(planned.inAppRecipients).toEqual([1]);
    const whatsapp = planned.externalDeliveries.filter(
      (delivery) => delivery.channel === "whatsapp",
    );
    expect(whatsapp).toEqual([
      { userId: 1, channel: "whatsapp", recipientAddress: "51911000001" },
    ]);
  });

  it("schedules a WhatsApp delivery for lead.fulfillment_completed under the same conditions", async () => {
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 1,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: 1,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    await openSession(ctx.db, 1, NOW);

    const intent = makeIntent({
      id: "evt-fulfillment-completed",
      eventType: "lead.fulfillment_completed",
      channels: ["in_app", "whatsapp"],
      recipientUserId: 1,
    });
    await enqueueNotifications(ctx.db, [intent], NOW);

    const entry = await ctx.db
      .selectFrom("notification_outbox")
      .selectAll()
      .where("id", "=", intent.id)
      .executeTakeFirstOrThrow();

    const planned = await planDeliveries(
      ctx.db,
      {
        id: entry.id,
        event_type: entry.event_type,
        audience_json: entry.audience_json,
        channels_json: entry.channels_json,
      },
      NOW,
    );

    expect(planned.inAppRecipients).toEqual([1]);
    expect(
      planned.externalDeliveries.filter(
        (delivery) => delivery.channel === "whatsapp",
      ),
    ).toEqual([
      { userId: 1, channel: "whatsapp", recipientAddress: "51911000001" },
    ]);
  });

  it("does not schedule a WhatsApp delivery when the address is missing or unverified", async () => {
    // Same intent as ready_for_sale, but the user has no verified WA address.
    await openSession(ctx.db, 1, NOW);

    const intent = makeIntent({
      id: "evt-no-addr",
      eventType: "lead.ready_for_sale",
      channels: ["in_app", "whatsapp"],
      recipientUserId: 1,
    });
    await enqueueNotifications(ctx.db, [intent], NOW);

    const entry = await ctx.db
      .selectFrom("notification_outbox")
      .selectAll()
      .where("id", "=", intent.id)
      .executeTakeFirstOrThrow();

    const planned = await planDeliveries(
      ctx.db,
      {
        id: entry.id,
        event_type: entry.event_type,
        audience_json: entry.audience_json,
        channels_json: entry.channels_json,
      },
      NOW,
    );

    expect(planned.inAppRecipients).toEqual([1]);
    expect(
      planned.externalDeliveries.filter(
        (delivery) => delivery.channel === "whatsapp",
      ),
    ).toEqual([]);
  });

  it("does not schedule a WhatsApp delivery when the Meta session is not active", async () => {
    // Verified address, but no active session: cold outbound, planner must
    // drop the WA leg so the provider does not surface a 131047/133018 error.
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 1,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: 1,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    // Intentionally not calling openSession.

    const intent = makeIntent({
      id: "evt-cold",
      eventType: "lead.ready_for_sale",
      channels: ["in_app", "whatsapp"],
      recipientUserId: 1,
    });
    await enqueueNotifications(ctx.db, [intent], NOW);

    const entry = await ctx.db
      .selectFrom("notification_outbox")
      .selectAll()
      .where("id", "=", intent.id)
      .executeTakeFirstOrThrow();

    const planned = await planDeliveries(
      ctx.db,
      {
        id: entry.id,
        event_type: entry.event_type,
        audience_json: entry.audience_json,
        channels_json: entry.channels_json,
      },
      NOW,
    );

    expect(planned.inAppRecipients).toEqual([1]);
    expect(
      planned.externalDeliveries.filter(
        (delivery) => delivery.channel === "whatsapp",
      ),
    ).toEqual([]);
  });

  it("does not produce WhatsApp deliveries for events whose intent channels are in_app only", async () => {
    // Confirms the unchanged event (ready_for_quotation) is not accidentally
    // promoted. The intent here is hand-rolled with in_app only — exactly
    // what the reactor still emits for PRICING stage transitions.
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 1,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: 1,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    await openSession(ctx.db, 1, NOW);

    const intent: NotificationIntent = {
      id: "evt-ready-for-quotation",
      eventType: "lead.ready_for_quotation",
      audience: {
        kind: "branch_role",
        branchId: 1,
        role: "back_office",
      },
      channels: ["in_app"],
      priority: "normal",
      title: "Cliente listo para tarifa",
      bodyText: "El cliente está listo para proponer tarifa",
      actionUrl: null,
    };
    await enqueueNotifications(ctx.db, [intent], NOW);

    const entry = await ctx.db
      .selectFrom("notification_outbox")
      .selectAll()
      .where("id", "=", intent.id)
      .executeTakeFirstOrThrow();

    const planned = await planDeliveries(
      ctx.db,
      {
        id: entry.id,
        event_type: entry.event_type,
        audience_json: entry.audience_json,
        channels_json: entry.channels_json,
      },
      NOW,
    );

    // The audience (branch_role: back_office) resolves to the seeded back-office
    // user in branch 1 (user_id 2), not to user 1. We assert on the shape, not
    // the specific user, so the seed can evolve without breaking this test.
    expect(planned.inAppRecipients).toContain(2);
    expect(planned.inAppRecipients).not.toContain(1);
    expect(
      planned.externalDeliveries.filter(
        (delivery) => delivery.channel === "whatsapp",
      ),
    ).toEqual([]);
  });

  it("routes the AWAITING_PAYMENT handoff to WhatsApp with the URL inline", async () => {
    // This is the contract emitted by the reactor for the "Link de pago listo"
    // step. The body is what delivery-executor will hand to Kapso.
    await ctx.repos.userChannelAddresses.upsert({
      user_id: 1,
      channel: "whatsapp",
      address: "51911000001",
      is_verified: 1,
      verified_at: NOW,
      created_at: NOW,
      updated_at: NOW,
    });
    await openSession(ctx.db, 1, NOW);

    const intent: NotificationIntent = {
      id: "evt-1:AWAITING_PAYMENT",
      eventType: "lead.fulfillment_handoff",
      audience: { kind: "user_ids", userIds: [1] },
      channels: ["in_app", "whatsapp"],
      priority: "high",
      title: "Link de pago listo",
      bodyText: [
        "Link(s) de pago listos para el cliente RUC 20123456789:",
        "• POS #1: https://pay.example.com/abc",
        "Envíalo(s) al cliente y sube el comprobante.",
      ].join("\n"),
      actionUrl: "/records/lead-1",
    };
    await enqueueNotifications(ctx.db, [intent], NOW);

    const entry = await ctx.db
      .selectFrom("notification_outbox")
      .selectAll()
      .where("id", "=", intent.id)
      .executeTakeFirstOrThrow();

    const planned = await planDeliveries(
      ctx.db,
      {
        id: entry.id,
        event_type: entry.event_type,
        audience_json: entry.audience_json,
        channels_json: entry.channels_json,
      },
      NOW,
    );

    expect(planned.inAppRecipients).toEqual([1]);
    const whatsapp = planned.externalDeliveries.filter(
      (delivery) => delivery.channel === "whatsapp",
    );
    expect(whatsapp).toEqual([
      { userId: 1, channel: "whatsapp", recipientAddress: "51911000001" },
    ]);

    // The outbox row must preserve the URL in the body so the executor hands
    // it to Kapso verbatim.
    const stored = await ctx.db
      .selectFrom("notification_outbox")
      .select("body_text")
      .where("id", "=", intent.id)
      .executeTakeFirstOrThrow();
    expect(stored.body_text).toContain("https://pay.example.com/abc");
    expect(stored.body_text).toContain("RUC 20123456789");
  });
});
