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
  };
}
