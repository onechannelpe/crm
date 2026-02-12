import { db } from "../client";
import type { LeadAssignment, NewLeadAssignment } from "../schema";

export class LeadsRepository {
  static async getActiveByUser(userId: number): Promise<LeadAssignment[]> {
    return await db
      .selectFrom("lead_assignments")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "=", "Active")
      .where("expires_at", ">", Date.now())
      .orderBy("assigned_at", "desc")
      .execute();
  }

  static async create(assignment: NewLeadAssignment): Promise<number> {
    const result = await db
      .insertInto("lead_assignments")
      .values(assignment)
      .executeTakeFirstOrThrow();

    return Number(result.insertId);
  }

  static async createMany(
    assignments: NewLeadAssignment[],
  ): Promise<void> {
    if (assignments.length === 0) return;
    
    await db
      .insertInto("lead_assignments")
      .values(assignments)
      .execute();
  }

  static async markCompleted(id: number): Promise<void> {
    await db
      .updateTable("lead_assignments")
      .set({ status: "Completed" })
      .where("id", "=", id)
      .execute();
  }

  static async countActiveByUser(userId: number): Promise<number> {
    const result = await db
      .selectFrom("lead_assignments")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("user_id", "=", userId)
      .where("status", "=", "Active")
      .where("expires_at", ">", Date.now())
      .executeTakeFirst();

    return Number(result?.count || 0);
  }
}
