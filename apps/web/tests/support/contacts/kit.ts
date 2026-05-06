import type { TestDbContext } from "@tests/support/runtime/db";

import { seedLeadAssignments, type LeadAssignmentSeedRow } from "./seed";

export function createContactsTestKit(ctx: TestDbContext) {
  return {
    async seedAssignments(rows: LeadAssignmentSeedRow[]): Promise<void> {
      await seedLeadAssignments(ctx, rows);
    },

    async lockOrganization(input: {
      organizationId: string;
      branchId: number;
      userId: number;
      now?: number;
    }): Promise<void> {
      await ctx.db
        .updateTable("organizations")
        .set({
          locked_branch_id: input.branchId,
          locked_at: input.now ?? Date.now(),
          locked_by_user_id: input.userId,
        })
        .where("id", "=", input.organizationId)
        .execute();
    },

    async visibleOrganizationIds(
      branchId: number,
      limit = 50,
    ): Promise<string[]> {
      const rows = await ctx.repos.organizations.findUnlockedOrLockedToBranch(
        branchId,
        limit,
      );
      return rows.map((row) => row.id);
    },

    async activeContactIdsForUser(userId: number): Promise<number[]> {
      const rows = await ctx.repos.contactAssignments.findActiveByUser(userId);
      return rows.map((row) => row.contact_id);
    },

    async hasActiveAssignment(
      userId: number,
      contactId: number,
    ): Promise<boolean> {
      return ctx.repos.contactAssignments.hasActiveForContact(
        userId,
        contactId,
      );
    },

    async lockSnapshot(organizationId: string): Promise<{
      lockedBranchId: number | null;
      lockedByUserId: number | null;
      lockedAt: number | null;
    }> {
      const org = await ctx.repos.organizations.findById(organizationId);
      return {
        lockedBranchId: org?.locked_branch_id ?? null,
        lockedByUserId: org?.locked_by_user_id ?? null,
        lockedAt: org?.locked_at ?? null,
      };
    },
  };
}
