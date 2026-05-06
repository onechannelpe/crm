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
    const contacts = createContactsTestKit(ctx);

    await contacts.lockOrganization({
      organizationId: lima.id,
      branchId: 1,
      userId: 1,
      now,
    });
    await contacts.lockOrganization({
      organizationId: norte.id,
      branchId: 2,
      userId: 3,
      now,
    });

    const branch1Visible = await contacts.visibleOrganizationIds(1);
    const branch2Visible = await contacts.visibleOrganizationIds(2);

    expect(branch1Visible).toContain(lima.id);
    expect(branch1Visible).not.toContain(norte.id);
    expect(branch2Visible).toContain(norte.id);
    expect(branch2Visible).not.toContain(lima.id);
  });

  it("lockToBranch persists lock metadata", async () => {
    const { lima } = ctx.fixtures.organizations;
    const contacts = createContactsTestKit(ctx);

    await ctx.repos.organizations.lockToBranch(lima.id, 2, 3);
    const lock = await contacts.lockSnapshot(lima.id);

    expect(lock.lockedBranchId).toBe(2);
    expect(lock.lockedByUserId).toBe(3);
    expect((lock.lockedAt ?? 0) > 0).toBe(true);
  });
});
