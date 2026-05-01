import type { TestDbContext } from "@tests/support/runtime/db";

export interface LeadAssignmentSeedRow {
  userId: number;
  contactId: number;
  assignedAt: number;
  expiresAt: number;
  status: "active" | "completed";
}

export async function seedLeadAssignments(
  ctx: TestDbContext,
  rows: LeadAssignmentSeedRow[],
): Promise<void> {
  await ctx.db
    .insertInto("lead_assignments")
    .values(
      rows.map((row) => ({
        user_id: row.userId,
        contact_id: row.contactId,
        assigned_at: row.assignedAt,
        expires_at: row.expiresAt,
        status: row.status,
      })),
    )
    .execute();
}
