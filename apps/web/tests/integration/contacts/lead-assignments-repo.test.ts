import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("lead assignment repository", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("lead-assignments");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("returns only active and non-expired assignments", async () => {
    const now = Date.now();
    await ctx.db
      .insertInto("lead_assignments")
      .values([
        {
          user_id: 1,
          contact_id: 1,
          assigned_at: now,
          expires_at: now + 60_000,
          status: "active",
        },
        {
          user_id: 1,
          contact_id: 2,
          assigned_at: now,
          expires_at: now - 1,
          status: "active",
        },
        {
          user_id: 1,
          contact_id: 2,
          assigned_at: now,
          expires_at: now + 60_000,
          status: "completed",
        },
      ])
      .execute();

    const active = await ctx.repos.contactAssignments.findActiveByUser(1);
    expect(active).toHaveLength(1);
    expect(active[0].contact_id).toBe(1);
  });

  it("hasActiveForContact respects expiry and ownership", async () => {
    const now = Date.now();
    await ctx.db
      .insertInto("lead_assignments")
      .values([
        {
          user_id: 1,
          contact_id: 1,
          assigned_at: now,
          expires_at: now + 60_000,
          status: "active",
        },
        {
          user_id: 3,
          contact_id: 2,
          assigned_at: now,
          expires_at: now + 60_000,
          status: "active",
        },
      ])
      .execute();

    expect(await ctx.repos.contactAssignments.hasActiveForContact(1, 1)).toBe(
      true,
    );
    expect(await ctx.repos.contactAssignments.hasActiveForContact(1, 2)).toBe(
      false,
    );
    expect(await ctx.repos.contactAssignments.hasActiveForContact(3, 2)).toBe(
      true,
    );
  });
});
