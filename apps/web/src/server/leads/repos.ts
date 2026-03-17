import type { Kysely } from "kysely";
import { sql } from "kysely";

import type { Database, NewLeadAssignment } from "~/lib/db/types";

export function createLeadAssignmentsRepo(db: Kysely<Database>) {
  return {
    create(values: NewLeadAssignment) {
      return db
        .insertInto("lead_assignments")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    async createMany(assignments: NewLeadAssignment[]): Promise<void> {
      if (assignments.length === 0) return;
      await db.insertInto("lead_assignments").values(assignments).execute();
    },

    findActiveByUser(userId: number) {
      return db
        .selectFrom("lead_assignments")
        .selectAll()
        .where("user_id", "=", userId)
        .where("status", "=", "active")
        .where("expires_at", ">", Date.now())
        .execute();
    },

    findActiveByUserWithContacts(userId: number) {
      return db
        .selectFrom("lead_assignments")
        .innerJoin("contacts", "contacts.id", "lead_assignments.contact_id")
        .select([
          "lead_assignments.id as assignmentId",
          "lead_assignments.assigned_at",
          "lead_assignments.expires_at",
          "lead_assignments.status",
          "contacts.id as contactId",
          "contacts.name",
          "contacts.dni",
          "contacts.phone_primary",
          "contacts.organization_id",
        ])
        .where("lead_assignments.user_id", "=", userId)
        .where("lead_assignments.status", "=", "active")
        .where("lead_assignments.expires_at", ">", Date.now())
        .orderBy("lead_assignments.assigned_at", "desc")
        .execute();
    },

    async countActiveByUser(userId: number) {
      const rows = await this.findActiveByUser(userId);
      return rows.length;
    },

    async countActiveByUsers(userIds: number[]) {
      if (userIds.length === 0) {
        return [] as Array<{ userId: number; activeCount: number }>;
      }

      const rows = await db
        .selectFrom("lead_assignments")
        .select(["user_id as userId", sql<number>`count(*)`.as("activeCount")])
        .where("user_id", "in", userIds)
        .where("status", "=", "active")
        .where("expires_at", ">", Date.now())
        .groupBy("user_id")
        .execute();

      return rows.map((row) => ({
        userId: Number(row.userId),
        activeCount: Number(row.activeCount),
      }));
    },

    findActiveForContact(userId: number, contactId: number) {
      return db
        .selectFrom("lead_assignments")
        .selectAll()
        .where("user_id", "=", userId)
        .where("contact_id", "=", contactId)
        .where("status", "=", "active")
        .where("expires_at", ">", Date.now())
        .executeTakeFirst();
    },

    async hasActiveForContact(userId: number, contactId: number) {
      const row = await this.findActiveForContact(userId, contactId);
      return !!row;
    },

    findActiveByIdForUser(id: number, userId: number) {
      return db
        .selectFrom("lead_assignments")
        .selectAll()
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .where("status", "=", "active")
        .where("expires_at", ">", Date.now())
        .executeTakeFirst();
    },

    markCompleted(id: number, userId: number) {
      return db
        .updateTable("lead_assignments")
        .set({ status: "completed" })
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .execute();
    },
  };
}
