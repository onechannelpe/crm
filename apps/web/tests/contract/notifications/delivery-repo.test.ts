import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createDeliveryRepository,
  type PlannedDeliveryRow,
} from "~/server/notifications/repos/delivery-repo";

const NOW = 1_700_000_000_000;

function planned(
  overrides: Partial<PlannedDeliveryRow> = {},
): PlannedDeliveryRow {
  return {
    intent_id: "intent-1",
    user_id: 1,
    channel: "whatsapp",
    recipient_address: "51911000001",
    title: "Test",
    body_text: "Body",
    action_url: null,
    ...overrides,
  };
}

describe("delivery repository", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("delivery-repo");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("inserts planned deliveries idempotently per (intent, user, channel)", async () => {
    const repository = createDeliveryRepository(ctx.db);

    await repository.insertPlanned([planned()], NOW);
    await repository.insertPlanned([planned()], NOW);

    const rows = await ctx.db
      .selectFrom("notification_deliveries")
      .select(["intent_id", "user_id", "channel", "queue_state"])
      .execute();
    expect(rows).toEqual([
      {
        intent_id: "intent-1",
        user_id: 1,
        channel: "whatsapp",
        queue_state: "pending",
      },
    ]);
  });

  it("claims a pending delivery, taking the lease and bumping the attempt", async () => {
    const repository = createDeliveryRepository(ctx.db);
    await repository.insertPlanned([planned()], NOW);

    const [job] = await repository.claimPending("worker", NOW, 10, 30_000);
    if (!job) throw new Error("expected planned delivery job");

    expect(job).toMatchObject({
      intent_id: "intent-1",
      user_id: 1,
      channel: "whatsapp",
      attempt_count: 1,
    });
    const second = await repository.claimPending("worker-2", NOW, 10, 30_000);
    expect(second).toEqual([]);
  });

  it("records the provider attempt then marks the delivery sent", async () => {
    const repository = createDeliveryRepository(ctx.db);
    await repository.insertPlanned([planned()], NOW);
    const [job] = await repository.claimPending("worker", NOW, 10, 30_000);
    if (!job) throw new Error("expected planned delivery job");

    await repository.recordAttempt(job.id, {
      provider: "kapso",
      provider_message_id: "wamid.test",
      error_code: null,
      error_message: null,
      latency_ms: null,
    });
    await repository.markSent(job.id, NOW);

    const row = await ctx.db
      .selectFrom("notification_deliveries")
      .select([
        "queue_state",
        "provider",
        "provider_message_id",
        "sent_at",
        "lease_owner",
        "lease_until",
      ])
      .where("id", "=", job.id)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      queue_state: "done",
      provider: "kapso",
      provider_message_id: "wamid.test",
      sent_at: NOW,
      lease_owner: null,
      lease_until: null,
    });
  });

  it("schedules a retry back to a claimable pending state", async () => {
    const repository = createDeliveryRepository(ctx.db);
    await repository.insertPlanned([planned({ channel: "email" })], NOW);
    const [first] = await repository.claimPending("worker", NOW, 10, 30_000);
    if (!first) throw new Error("expected planned delivery job");

    await repository.recordAttempt(first.id, {
      provider: "resend",
      provider_message_id: null,
      error_code: "rate_limited",
      error_message: "try later",
      latency_ms: null,
    });
    await repository.scheduleRetry(first.id, NOW + 5_000);

    const retryRow = await ctx.db
      .selectFrom("notification_deliveries")
      .select(["queue_state", "available_at", "lease_owner"])
      .where("id", "=", first.id)
      .executeTakeFirstOrThrow();
    expect(retryRow).toEqual({
      queue_state: "pending",
      available_at: NOW + 5_000,
      lease_owner: null,
    });

    const [second] = await repository.claimPending(
      "worker",
      NOW + 5_000,
      10,
      30_000,
    );
    expect(second?.id).toBe(first.id);
    expect(second?.attempt_count).toBe(2);
  });

  it("marks a delivery failed while preserving the recorded error", async () => {
    const repository = createDeliveryRepository(ctx.db);
    await repository.insertPlanned([planned({ channel: "email" })], NOW);
    const [job] = await repository.claimPending("worker", NOW, 10, 30_000);
    if (!job) throw new Error("expected planned delivery job");
    await repository.recordAttempt(job.id, {
      provider: "resend",
      provider_message_id: null,
      error_code: "bad_request",
      error_message: "rejected",
      latency_ms: null,
    });

    await repository.markFailed(job.id);

    const row = await ctx.db
      .selectFrom("notification_deliveries")
      .select(["queue_state", "error_code", "error_message", "lease_owner"])
      .where("id", "=", job.id)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      queue_state: "failed",
      error_code: "bad_request",
      error_message: "rejected",
      lease_owner: null,
    });
  });

  it("counts pending and sending deliveries as outstanding", async () => {
    const repository = createDeliveryRepository(ctx.db);
    await repository.insertPlanned(
      [
        planned(),
        planned({ channel: "email", recipient_address: "a@test.local" }),
      ],
      NOW,
    );

    expect(await repository.countOutstanding()).toBe(2);

    const [job] = await repository.claimPending("worker", NOW, 1, 30_000);
    if (!job) throw new Error("expected job");
    await repository.markSent(job.id, NOW);
    expect(await repository.countOutstanding()).toBe(1);
  });
});
