import type { TestDbContext } from "@tests/support/runtime/db";

import type {
  BranchId,
  OrganizationId,
  OrganizationPersonId,
  UserId,
} from "~/server/shared/ids";

import { seedLeadAssignments, type LeadAssignmentSeedRow } from "./seed";

export function createContactsTestKit(ctx: TestDbContext) {
  return {
    async seedAssignments(rows: LeadAssignmentSeedRow[]): Promise<void> {
      await seedLeadAssignments(ctx, rows);
    },

    async lockOrganization(input: {
      organizationId: OrganizationId;
      branchId: BranchId;
      userId: UserId;
      now?: Date;
    }): Promise<void> {
      const lockedAt = input.now ?? new Date();
      await ctx.db
        .insertInto("organization_branch_locks")
        .values({
          organization_id: input.organizationId,
          branch_id: input.branchId,
          locked_at: lockedAt,
          locked_by_user_id: input.userId,
        })
        .onConflict((oc) =>
          oc.column("organization_id").doUpdateSet({
            branch_id: input.branchId,
            locked_at: lockedAt,
            locked_by_user_id: input.userId,
          }),
        )
        .execute();
    },

    async visibleOrganizationIds(
      branchId: BranchId,
      limit = 50,
    ): Promise<OrganizationId[]> {
      const rows = await ctx.repos.organizations.findUnlockedOrLockedToBranch(
        branchId,
        limit,
      );
      return rows.map((row) => row.id);
    },

    async activeContactIdsForUser(
      userId: UserId,
    ): Promise<OrganizationPersonId[]> {
      const rows = await ctx.repos.contactAssignments.findActiveByUser(userId);
      return rows.map((row) => row.contact_id);
    },

    async hasActiveAssignment(
      userId: UserId,
      contactId: OrganizationPersonId,
    ): Promise<boolean> {
      return ctx.repos.contactAssignments.hasActiveForContact(
        userId,
        contactId,
      );
    },

    async lockSnapshot(organizationId: OrganizationId): Promise<{
      lockedBranchId: BranchId | null;
      lockedByUserId: UserId | null;
      lockedAt: Date | null;
    }> {
      const lock = await ctx.db
        .selectFrom("organization_branch_locks")
        .select(["branch_id", "locked_by_user_id", "locked_at"])
        .where("organization_id", "=", organizationId)
        .executeTakeFirst();
      return {
        lockedBranchId: lock?.branch_id ?? null,
        lockedByUserId: lock?.locked_by_user_id ?? null,
        lockedAt: lock?.locked_at ?? null,
      };
    },
  };
}
