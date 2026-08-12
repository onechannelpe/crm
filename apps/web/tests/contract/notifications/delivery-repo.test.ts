import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { NotificationIntentId, UserId } from "~/domain/ids";
import {
  createDeliveryRepository,
  type PlannedDeliveryRow,
} from "~/server/notifications/repos/delivery-repo";

const NOW = new Date(1_700_000_000_000);
const LEASE_MS = 30_000;
const RETRY_AT = new Date(NOW.getTime() + 5_000);
const RECLAIM_AT = new Date(NOW.getTime() + LEASE_MS + 1);
const WORKER_ID = "worker";
const INTENT_ID = NotificationIntentId.trust("intent-1");
const USER_ID = UserId.trust("01974fd5-f261-7a7d-93f5-2f3d0f969001");

function planned(
  overrides: Partial<PlannedDeliveryRow> = {},
): PlannedDeliveryRow {
  return {
    intent_id: INTENT_ID,
    user_id: USER_ID,
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

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("delivery-repo");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
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
        user_id: USER_ID,
        channel: "whatsapp",
        queue_state: "pending",
      },
    ]);
  });

  it("claims a pending delivery, taking the lease and bumping the attempt", async () => {
    const repository = createDeliveryRepository(ctx.db);

    await repository.insertPlanned([planned()], NOW);

    const [job] = await repository.store.claim(WORKER_ID, NOW, 10, LEASE_MS);

    if (!job) {
      throw new Error("expected planned delivery job");
    }

    expect(job).toMatchObject({
      intent_id: "intent-1",
      user_id: USER_ID,
      channel: "whatsapp",
      attempt_count: 1,
    });

    const second = await repository.store.claim("worker-2", NOW, 10, LEASE_MS);

    expect(second).toEqual([]);
  });

  it("settles provider receipt and sent state in one lease-guarded update", async () => {
    const repository = createDeliveryRepository(ctx.db);

    await repository.insertPlanned([planned()], NOW);

    const [job] = await repository.store.claim(WORKER_ID, NOW, 10, LEASE_MS);

    if (!job) {
      throw new Error("expected planned delivery job");
    }

    await repository.store.markDone(job.id, WORKER_ID, NOW, {
      provider: "kapso",
      provider_message_id: "wamid.test",
      error_code: null,
      error_message: null,
    });

    const row = await ctx.db
      .selectFrom("notification_deliveries")
      .select([
        "queue_state",
        "provider",
        "provider_message_id",
        "completed_at",
        "lease_owner",
      ])
      .where("id", "=", job.id)
      .executeTakeFirstOrThrow();

    expect(row).toEqual({
      queue_state: "done",
      provider: "kapso",
      provider_message_id: "wamid.test",
      completed_at: NOW,
      lease_owner: null,
    });
  });

  it("schedules a retry back to a claimable pending state", async () => {
    const repository = createDeliveryRepository(ctx.db);

    await repository.insertPlanned([planned({ channel: "email" })], NOW);

    const [first] = await repository.store.claim(WORKER_ID, NOW, 10, LEASE_MS);

    if (!first) {
      throw new Error("expected planned delivery job");
    }

    await repository.store.scheduleRetry(
      first.id,
      WORKER_ID,
      RETRY_AT,
      "try later",
      {
        provider: "resend",
        provider_message_id: null,
        error_code: "rate_limited",
        error_message: "try later",
      },
    );

    const retryRow = await ctx.db
      .selectFrom("notification_deliveries")
      .select(["queue_state", "claimable_at", "lease_owner"])
      .where("id", "=", first.id)
      .executeTakeFirstOrThrow();

    expect(retryRow).toEqual({
      queue_state: "pending",
      claimable_at: RETRY_AT,
      lease_owner: null,
    });

    const [second] = await repository.store.claim(
      WORKER_ID,
      RETRY_AT,
      10,
      LEASE_MS,
    );

    expect(second?.id).toBe(first.id);
    expect(second?.attempt_count).toBe(2);
  });

  it("settles provider error and failed state in one lease-guarded update", async () => {
    const repository = createDeliveryRepository(ctx.db);

    await repository.insertPlanned([planned({ channel: "email" })], NOW);

    const [job] = await repository.store.claim(WORKER_ID, NOW, 10, LEASE_MS);

    if (!job) {
      throw new Error("expected planned delivery job");
    }

    await repository.store.markFailed(job.id, WORKER_ID, NOW, "rejected", {
      provider: "resend",
      provider_message_id: null,
      error_code: "bad_request",
      error_message: "rejected",
    });

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

  it("reclaims a delivery abandoned past its lease deadline", async () => {
    const repository = createDeliveryRepository(ctx.db);

    await repository.insertPlanned([planned()], NOW);

    const [leased] = await repository.store.claim(
      "dead-worker",
      NOW,
      1,
      LEASE_MS,
    );

    if (!leased) {
      throw new Error("expected planned delivery job");
    }

    expect(await repository.store.claim("other", NOW, 1, LEASE_MS)).toEqual([]);

    const [reclaimed] = await repository.store.claim(
      "other",
      RECLAIM_AT,
      1,
      LEASE_MS,
    );

    expect(reclaimed?.id).toBe(leased.id);
    expect(reclaimed?.attempt_count).toBe(2);
  });

  it("stops reclaiming a job that exhausted its attempts without settling", async () => {
    const repository = createDeliveryRepository(ctx.db);

    await repository.insertPlanned([planned()], NOW);

    let deadline = NOW;

    for (let attempt = 1; attempt <= 5; attempt++) {
      // oxlint-disable-next-line no-await-in-loop
      const [claimed] = await repository.store.claim(
        `worker-${attempt}`,
        deadline,
        1,
        LEASE_MS,
      );

      expect(claimed?.attempt_count).toBe(attempt);

      deadline = new Date(deadline.getTime() + LEASE_MS + 1);
    }

    expect(
      await repository.store.claim("worker-6", deadline, 1, LEASE_MS),
    ).toEqual([]);
  });

  it("rejects provider fields from a worker whose lease was reclaimed", async () => {
    const repository = createDeliveryRepository(ctx.db);

    await repository.insertPlanned([planned()], NOW);

    const [staleJob] = await repository.store.claim(
      "stale-worker",
      NOW,
      1,
      LEASE_MS,
    );

    if (!staleJob) {
      throw new Error("expected planned delivery job");
    }

    const [currentJob] = await repository.store.claim(
      "current-worker",
      RECLAIM_AT,
      1,
      LEASE_MS,
    );

    if (!currentJob) {
      throw new Error("expected reclaimed delivery job");
    }

    const staleSettled = await repository.store.markDone(
      staleJob.id,
      "stale-worker",
      RECLAIM_AT,
      {
        provider: "kapso",
        provider_message_id: "stale-message",
        error_code: null,
        error_message: null,
      },
    );

    const currentSettled = await repository.store.markDone(
      currentJob.id,
      "current-worker",
      RECLAIM_AT,
      {
        provider: "whatsapp_cloud",
        provider_message_id: "current-message",
        error_code: null,
        error_message: null,
      },
    );

    expect(staleSettled).toBe(false);
    expect(currentSettled).toBe(true);

    const row = await ctx.db
      .selectFrom("notification_deliveries")
      .select(["queue_state", "provider", "provider_message_id"])
      .where("id", "=", currentJob.id)
      .executeTakeFirstOrThrow();

    expect(row).toEqual({
      queue_state: "done",
      provider: "whatsapp_cloud",
      provider_message_id: "current-message",
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

    expect(await repository.store.countOutstanding()).toBe(2);

    const [job] = await repository.store.claim(WORKER_ID, NOW, 1, LEASE_MS);

    if (!job) {
      throw new Error("expected job");
    }

    await repository.store.markDone(job.id, WORKER_ID, NOW);

    expect(await repository.store.countOutstanding()).toBe(1);
  });
});
