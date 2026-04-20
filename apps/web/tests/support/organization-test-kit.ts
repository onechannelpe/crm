import {
  ISOLATED_DB_IDENTITIES,
  TEST_IDS,
} from "./identities/seeded-identities";
import type { TestDbContext } from "./test-db";

/**
 * Helper to manage organization states in tests.
 */
export function createOrganizationTestKit(ctx: TestDbContext) {
  return {
    /**
     * Directly locks an organization to a branch using a manual DB update.
     * Useful for setting up baseline states that bypass repository logic.
     */
    async setupManualLock(
      orgId = TEST_IDS.ORG_LIMA,
      branchId = TEST_IDS.BRANCH_LIMA,
      userId = ISOLATED_DB_IDENTITIES.execOne.userId,
      lockedAt = Date.now(),
    ) {
      await ctx.db
        .updateTable("organizations")
        .set({
          locked_branch_id: branchId,
          locked_at: lockedAt,
          locked_by_user_id: userId,
        })
        .where("id", "=", orgId)
        .execute();
    },

    /**
     * Proxies to repository method to perform a lock.
     */
    async lockToBranch(
      orgId = TEST_IDS.ORG_LIMA,
      branchId = TEST_IDS.BRANCH_NORTE,
      userId = ISOLATED_DB_IDENTITIES.execTwo.userId,
    ) {
      return ctx.repos.organizations.lockToBranch(orgId, branchId, userId);
    },

    /**
     * Finds an organization by ID.
     */
    async findById(orgId = TEST_IDS.ORG_LIMA) {
      return ctx.repos.organizations.findById(orgId);
    },

    /**
     * Lists organizations visible to a branch.
     */
    async findVisibleToBranch(branchId = TEST_IDS.BRANCH_LIMA, limit = 50) {
      return ctx.repos.organizations.findUnlockedOrLockedToBranch(
        branchId,
        limit,
      );
    },
  };
}
