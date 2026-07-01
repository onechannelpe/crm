import { createContactsTestKit } from "@tests/support/contacts/kit";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
    const { execOne, execTwo } = ctx.fixtures.users;
    const { lima: limaBranch, norte: norteBranch } = ctx.fixtures.branches;
    const contacts = createContactsTestKit(ctx);

    await contacts.lockOrganization({
      organizationId: lima.id,
      branchId: limaBranch.id,
      userId: execOne.id,
      now: new Date(now),
    });
    await contacts.lockOrganization({
      organizationId: norte.id,
      branchId: norteBranch.id,
      userId: execTwo.id,
      now: new Date(now),
    });

    const branch1Visible = await contacts.visibleOrganizationIds(limaBranch.id);
    const branch2Visible = await contacts.visibleOrganizationIds(
      norteBranch.id,
    );

    expect(branch1Visible).toContain(lima.id);
    expect(branch1Visible).not.toContain(norte.id);
    expect(branch2Visible).toContain(norte.id);
    expect(branch2Visible).not.toContain(lima.id);
  });

  it("lockToBranch persists lock metadata", async () => {
    const { lima } = ctx.fixtures.organizations;
    const { execTwo } = ctx.fixtures.users;
    const { norte } = ctx.fixtures.branches;
    const contacts = createContactsTestKit(ctx);

    await ctx.repos.organizations.lockToBranch(lima.id, norte.id, execTwo.id);
    const lock = await contacts.lockSnapshot(lima.id);

    expect(lock.lockedBranchId).toBe(norte.id);
    expect(lock.lockedByUserId).toBe(execTwo.id);
    expect(lock.lockedAt).toBeInstanceOf(Date);
  });
});
