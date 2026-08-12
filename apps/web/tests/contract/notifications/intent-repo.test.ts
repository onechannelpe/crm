import {
  anIntentRow,
  notificationIntentId,
} from "@tests/support/builders/notifications";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createIntentRepository } from "~/server/notifications/repos/intent-repo";

const NOW = new Date(1_700_000_000_000);
const RETRY_AT = new Date(NOW.getTime() + 5_000);

describe("intent repository", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("intent-repo");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  async function seedPending(id: string) {
    await ctx.db
      .insertInto("notification_intents")
      .values(anIntentRow({ id, now: NOW }))
      .execute();
  }

  it("leases a pending intent, increments the attempt, and takes the lease", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);

    const leased = await repository.store.claim("worker-1", NOW, 10, 30_000);

    expect(leased).toMatchObject([
      { id: "intent-1", attempt_count: 1, max_attempts: 5 },
    ]);

    const row = await ctx.db
      .selectFrom("notification_intents")
      .select(["queue_state", "lease_owner", "claimable_at"])
      .where("id", "=", notificationIntentId("intent-1"))
      .executeTakeFirstOrThrow();

    // While processing, claimable_at holds the lease expiration.
    expect(row).toEqual({
      queue_state: "processing",
      lease_owner: "worker-1",
      claimable_at: new Date(NOW.getTime() + 30_000),
    });
  });

  it("does not hand the same intent to a second worker while leased", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);

    await repository.store.claim("worker-1", NOW, 10, 30_000);
    const second = await repository.store.claim("worker-2", NOW, 10, 30_000);

    expect(second).toEqual([]);
  });

  it("marks an intent done and clears its lease", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);

    await repository.store.claim("worker-1", NOW, 10, 30_000);

    await repository.store.markDone(
      notificationIntentId("intent-1"),
      "worker-1",
      NOW,
    );

    const row = await ctx.db
      .selectFrom("notification_intents")
      .select(["queue_state", "completed_at", "lease_owner", "error_message"])
      .where("id", "=", notificationIntentId("intent-1"))
      .executeTakeFirstOrThrow();

    expect(row).toEqual({
      queue_state: "done",
      completed_at: NOW,
      lease_owner: null,
      error_message: null,
    });
  });

  it("schedules retries and records terminal failures", async () => {
    await seedPending("intent-retry");
    await seedPending("intent-fail");
    const repository = createIntentRepository(ctx.db);

    await repository.store.claim("worker-1", NOW, 10, 30_000);

    await repository.store.scheduleRetry(
      notificationIntentId("intent-retry"),
      "worker-1",
      RETRY_AT,
      null,
    );

    await repository.store.markFailed(
      notificationIntentId("intent-fail"),
      "worker-1",
      NOW,
      "boom",
    );

    const rows = await ctx.db
      .selectFrom("notification_intents")
      .select(["id", "queue_state", "error_message", "lease_owner"])
      .orderBy("id", "asc")
      .execute();

    expect(rows).toEqual([
      {
        id: "intent-fail",
        queue_state: "failed",
        error_message: "boom",
        lease_owner: null,
      },
      {
        id: "intent-retry",
        queue_state: "pending",
        error_message: null,
        lease_owner: null,
      },
    ]);

    const retry = await ctx.db
      .selectFrom("notification_intents")
      .select("claimable_at")
      .where("id", "=", notificationIntentId("intent-retry"))
      .executeTakeFirstOrThrow();

    expect(retry.claimable_at).toEqual(RETRY_AT);
  });

  it("counts pending and processing intents as outstanding", async () => {
    await seedPending("intent-1");
    await seedPending("intent-2");
    const repository = createIntentRepository(ctx.db);

    await repository.store.claim("worker-1", NOW, 1, 30_000);

    expect(await repository.store.countOutstanding()).toBe(2);

    await repository.store.markDone(
      notificationIntentId("intent-1"),
      "worker-1",
      NOW,
    );

    expect(await repository.store.countOutstanding()).toBe(1);
  });
});
