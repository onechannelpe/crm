import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createNotificationDeliveryRepository } from "~/server/notifications/repos/delivery";
import { createNotificationOutboxProcessingRepository } from "~/server/notifications/repos/outbox-processing";
import { createNotificationPlanningRepository } from "~/server/notifications/repos/planning";
import { openSession } from "~/server/notifications/whatsapp-session";

const NOW = 1_700_000_000_000;

describe("notification pipeline repositories", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("notification-pipeline-repositories");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("loads audience, verified addresses, and active WhatsApp sessions", async () => {
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

    const repository = createNotificationPlanningRepository(ctx.db);
    const recipients = await repository.resolveAudience({
      kind: "user_ids",
      userIds: [1],
    });

    expect(recipients).toEqual([1]);
    expect(
      await repository.findVerifiedAddresses(recipients, "whatsapp"),
    ).toEqual(new Map([[1, "51911000001"]]));
    expect(await repository.findActiveWhatsAppUsers(recipients, NOW)).toEqual(
      new Set([1]),
    );
  });

  it("leases pending intents and records terminal state with one timestamp", async () => {
    await ctx.db
      .insertInto("notification_outbox")
      .values({
        id: "intent-1",
        event_type: "test.event",
        audience_json: JSON.stringify({ kind: "user_ids", userIds: [1] }),
        channels_json: JSON.stringify(["in_app"]),
        title: "Test",
        body_text: "Body",
        action_url: null,
        priority: "normal",
        status: "pending",
        attempt_count: 0,
        available_at: NOW,
        lease_owner: null,
        lease_until: null,
        error: null,
        created_at: NOW,
        processed_at: null,
      })
      .execute();

    const repository = createNotificationOutboxProcessingRepository(ctx.db);
    const leased = await repository.lease({
      workerId: "worker-1",
      now: NOW,
      limit: 10,
    });
    expect(leased.map(({ id }) => id)).toEqual(["intent-1"]);

    await repository.markDone("intent-1", NOW);
    const row = await ctx.db
      .selectFrom("notification_outbox")
      .select(["status", "processed_at"])
      .where("id", "=", "intent-1")
      .executeTakeFirstOrThrow();
    expect(row).toEqual({ status: "done", processed_at: NOW });
  });

  it("persists external delivery receipts", async () => {
    const repository = createNotificationDeliveryRepository(ctx.db);
    await repository.record({
      intent_id: "intent-1",
      recipient_channel: "whatsapp",
      recipient_address: "51911000001",
      provider: "kapso",
      provider_message_id: "wamid.test",
      status: "sent",
      error_code: null,
      error_message: null,
      latency_ms: null,
      created_at: NOW,
    });

    const row = await ctx.db
      .selectFrom("notification_deliveries")
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({
      intent_id: "intent-1",
      provider: "kapso",
      status: "sent",
    });
  });
});
