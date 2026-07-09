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
const WORKER_ID = "worker-1";

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

  it("leases a pending intent, incrementing the attempt and taking the lease", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);

    const leased = await repository.store.claim(WORKER_ID, NOW, 10, 30_000);

    expect(leased).toMatchObject([
      { id: "intent-1", attempt_count: 1, max_attempts: 5 },
    ]);
    const row = await ctx.db
      .selectFrom("notification_intents")
      .select(["queue_state", "lease_owner", "lease_until"])
      .where("id", "=", notificationIntentId("intent-1"))
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      queue_state: "processing",
      lease_owner: "worker-1",
      lease_until: new Date(NOW.getTime() + 30_000),
    });
  });

  it("does not hand the same intent to a second worker while leased", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);

    await repository.store.claim(WORKER_ID, NOW, 10, 30_000);
    const second = await repository.store.claim("worker-2", NOW, 10, 30_000);

    expect(second).toEqual([]);
  });

  it("records expanded state and clears the lease with one timestamp", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);
    await repository.store.claim(WORKER_ID, NOW, 10, 30_000);

    await repository.store.markDone(
      notificationIntentId("intent-1"),
      WORKER_ID,
      NOW,
    );

    const row = await ctx.db
      .selectFrom("notification_intents")
      .select([
        "queue_state",
        "expanded_at",
        "lease_owner",
        "lease_until",
        "error",
      ])
      .where("id", "=", notificationIntentId("intent-1"))
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      queue_state: "done",
      expanded_at: NOW,
      lease_owner: null,
      lease_until: null,
      error: null,
    });
  });

  it("schedules a retry back to pending and records terminal failure", async () => {
    await seedPending("intent-retry");
    await seedPending("intent-fail");
    const repository = createIntentRepository(ctx.db);
    await repository.store.claim(WORKER_ID, NOW, 10, 30_000);

    await repository.store.scheduleRetry(
      notificationIntentId("intent-retry"),
      WORKER_ID,
      RETRY_AT,
      null,
    );
    await repository.store.markFailed(
      notificationIntentId("intent-fail"),
      WORKER_ID,
      NOW,
      "boom",
    );

    const rows = await ctx.db
      .selectFrom("notification_intents")
      .select(["id", "queue_state", "available_at", "error", "lease_owner"])
      .orderBy("id", "asc")
      .execute();
    expect(rows).toEqual([
      {
        id: "intent-fail",
        queue_state: "failed",
        available_at: NOW,
        error: "boom",
        lease_owner: null,
      },
      {
        id: "intent-retry",
        queue_state: "pending",
        available_at: RETRY_AT,
        error: null,
        lease_owner: null,
      },
    ]);
  });

  it("counts pending and expanding intents as outstanding", async () => {
    await seedPending("intent-1");
    await seedPending("intent-2");
    const repository = createIntentRepository(ctx.db);
    await repository.store.claim(WORKER_ID, NOW, 1, 30_000);

    expect(await repository.countOutstanding()).toBe(2);

    await repository.store.markDone(
      notificationIntentId("intent-1"),
      WORKER_ID,
      NOW,
    );
    expect(await repository.countOutstanding()).toBe(1);
  });
});
