import { anOutboxIntentRow } from "@tests/support/builders/notifications";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createIntentRepository } from "~/server/notifications/repos/intent-repo";

const NOW = 1_700_000_000_000;

describe("intent repository", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("intent-repo");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  async function seedPending(id: string) {
    await ctx.db
      .insertInto("notification_outbox")
      .values(anOutboxIntentRow({ id, now: NOW }))
      .execute();
  }

  it("leases a pending intent, incrementing the attempt and taking the lease", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);

    const leased = await repository.claimPending("worker-1", NOW, 10, 30_000);

    expect(leased).toMatchObject([
      { id: "intent-1", attempt_count: 1, max_attempts: 5 },
    ]);
    const row = await ctx.db
      .selectFrom("notification_outbox")
      .select(["queue_state", "lease_owner", "lease_until"])
      .where("id", "=", "intent-1")
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      queue_state: "processing",
      lease_owner: "worker-1",
      lease_until: NOW + 30_000,
    });
  });

  it("does not hand the same intent to a second worker while leased", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);

    await repository.claimPending("worker-1", NOW, 10, 30_000);
    const second = await repository.claimPending("worker-2", NOW, 10, 30_000);

    expect(second).toEqual([]);
  });

  it("records expanded state and clears the lease with one timestamp", async () => {
    await seedPending("intent-1");
    const repository = createIntentRepository(ctx.db);
    await repository.claimPending("worker-1", NOW, 10, 30_000);

    await repository.markExpanded("intent-1", NOW);

    const row = await ctx.db
      .selectFrom("notification_outbox")
      .select([
        "queue_state",
        "expanded_at",
        "lease_owner",
        "lease_until",
        "error",
      ])
      .where("id", "=", "intent-1")
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
    await repository.claimPending("worker-1", NOW, 10, 30_000);

    await repository.scheduleRetry("intent-retry", NOW + 5_000);
    await repository.markFailed("intent-fail", "boom", NOW);

    const rows = await ctx.db
      .selectFrom("notification_outbox")
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
        available_at: NOW + 5_000,
        error: null,
        lease_owner: null,
      },
    ]);
  });

  it("counts pending and expanding intents as outstanding", async () => {
    await seedPending("intent-1");
    await seedPending("intent-2");
    const repository = createIntentRepository(ctx.db);
    await repository.claimPending("worker-1", NOW, 1, 30_000);

    expect(await repository.countOutstanding()).toBe(2);

    await repository.markExpanded("intent-1", NOW);
    expect(await repository.countOutstanding()).toBe(1);
  });
});
