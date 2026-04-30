import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("organization branch locking", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("org-locking");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("findUnlockedOrLockedToBranch isolates organizations by lock owner", async () => {
    const now = Date.now();
    const { lima, norte } = ctx.fixtures.organizations;

    await ctx.db
      .updateTable("organizations")
      .set({
        locked_branch_id: 1,
        locked_at: now,
        locked_by_user_id: 1,
      })
      .where("id", "=", lima.id)
      .execute();

    await ctx.db
      .updateTable("organizations")
      .set({
        locked_branch_id: 2,
        locked_at: now,
        locked_by_user_id: 3,
      })
      .where("id", "=", norte.id)
      .execute();

    const branch1Visible =
      await ctx.repos.organizations.findUnlockedOrLockedToBranch(1, 50);
    const branch2Visible =
      await ctx.repos.organizations.findUnlockedOrLockedToBranch(2, 50);

    expect(branch1Visible.map((x) => x.id)).toContain(lima.id);
    expect(branch1Visible.map((x) => x.id)).not.toContain(norte.id);
    expect(branch2Visible.map((x) => x.id)).toContain(norte.id);
    expect(branch2Visible.map((x) => x.id)).not.toContain(lima.id);
  });

  it("lockToBranch persists lock metadata", async () => {
    const { lima } = ctx.fixtures.organizations;

    await ctx.repos.organizations.lockToBranch(lima.id, 2, 3);
    const org = await ctx.repos.organizations.findById(lima.id);

    expect(org?.locked_branch_id).toBe(2);
    expect(org?.locked_by_user_id).toBe(3);
    expect((org?.locked_at ?? 0) > 0).toBe(true);
  });
});
