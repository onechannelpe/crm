import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  asUserId,
  asContactId,
  asAssignmentId,
} from "../../src/server/shared/ids";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

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
          id: asAssignmentId("00000000-0000-0000-0000-0000000000a1"),
          user_id: asUserId("1"),
          contact_id: asContactId("1"),
          assigned_at: now,
          expires_at: now + 60_000,
          status: "active",
        },
        {
          id: asAssignmentId("00000000-0000-0000-0000-0000000000a2"),
          user_id: asUserId("1"),
          contact_id: asContactId("2"),
          assigned_at: now,
          expires_at: now - 1,
          status: "active",
        },
        {
          id: asAssignmentId("00000000-0000-0000-0000-0000000000a3"),
          user_id: asUserId("1"),
          contact_id: asContactId("2"),
          assigned_at: now,
          expires_at: now + 60_000,
          status: "completed",
        },
      ])
      .execute();

    const active = await ctx.repos.contactAssignments.findActiveByUser(
      asUserId("1"),
    );
    expect(active).toHaveLength(1);
    expect(active[0].contact_id).toBe(asContactId("1"));
  });

  it("hasActiveForContact respects expiry and ownership", async () => {
    const now = Date.now();
    await ctx.db
      .insertInto("lead_assignments")
      .values([
        {
          id: asAssignmentId("00000000-0000-0000-0000-0000000000b1"),
          user_id: asUserId("1"),
          contact_id: asContactId("1"),
          assigned_at: now,
          expires_at: now + 60_000,
          status: "active",
        },
        {
          id: asAssignmentId("00000000-0000-0000-0000-0000000000b2"),
          user_id: asUserId("3"),
          contact_id: asContactId("2"),
          assigned_at: now,
          expires_at: now + 60_000,
          status: "active",
        },
      ])
      .execute();

    expect(
      await ctx.repos.contactAssignments.hasActiveForContact(
        asUserId("1"),
        asContactId("1"),
      ),
    ).toBe(true);
    expect(
      await ctx.repos.contactAssignments.hasActiveForContact(
        asUserId("1"),
        asContactId("2"),
      ),
    ).toBe(false);
    expect(
      await ctx.repos.contactAssignments.hasActiveForContact(
        asUserId("3"),
        asContactId("2"),
      ),
    ).toBe(true);
  });
});
