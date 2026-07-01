import type { TestDbContext } from "@tests/support/runtime/db";

import {
  asContactAssignmentId,
  type ContactAssignmentId,
  type OrganizationPersonId,
  type UserId,
} from "~/server/shared/ids";

export type { ContactAssignmentId };

export type ContactAssignmentSeedRow = {
  userId: UserId;
  contactId: OrganizationPersonId;
  assignedAt: Date;
  expiresAt: Date;
  status: "active" | "completed";
};

export function createContactAssignmentsTestKit(ctx: TestDbContext) {
  return {
    async seedAssignments(rows: ContactAssignmentSeedRow[]): Promise<void> {
      if (rows.length === 0) return;
      await ctx.db
        .insertInto("contact_assignments")
        .values(
          rows.map((row, index) => ({
            id: asContactAssignmentId(`seed-${row.userId}-${index}`),
            user_id: row.userId,
            contact_id: row.contactId,
            assigned_at: row.assignedAt,
            expires_at: row.expiresAt,
            status: row.status,
          })),
        )
        .execute();
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
  };
}
