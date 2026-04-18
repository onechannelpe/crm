import type { Insertable, Kysely } from "kysely";
import { sql } from "kysely";

import type { Database } from "~/lib/db/types";
import type { ActiveContactAssignmentView } from "~/server/contact-assignments/application/contracts";
import type { ContactAssignmentDraft } from "~/server/contact-assignments/domain/assignment";
import {
  asAssignmentId,
  asContactId,
  asOrganizationId,
  asUserId,
  type AssignmentId,
  type ContactId,
  type UserId,
} from "~/server/shared/ids";

type NewLeadAssignmentRow = Insertable<Database["lead_assignments"]>;

export function createContactAssignmentsRepo(db: Kysely<Database>) {
  return {
    create(values: NewLeadAssignmentRow) {
      return db
        .insertInto("lead_assignments")
        .values(values)
        .executeTakeFirstOrThrow();
    },

    async createMany(assignments: ContactAssignmentDraft[]): Promise<void> {
      if (assignments.length === 0) return;
      await db.insertInto("lead_assignments").values(assignments).execute();
    },

    findActiveByUser(userId: UserId) {
      return db
        .selectFrom("lead_assignments")
        .selectAll()
        .where("user_id", "=", userId)
        .where("status", "=", "active")
        .where("expires_at", ">", Date.now())
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            ...row,
            id: asAssignmentId(row.id),
            user_id: asUserId(row.user_id),
            contact_id: asContactId(row.contact_id),
          })),
        );
    },

    findActiveByUserWithContacts(
      userId: UserId,
    ): Promise<ActiveContactAssignmentView[]> {
      return db
        .selectFrom("lead_assignments")
        .innerJoin("contacts", "contacts.id", "lead_assignments.contact_id")
        .select([
          "lead_assignments.id as assignmentId",
          "lead_assignments.assigned_at as assignedAt",
          "lead_assignments.expires_at as expiresAt",
          "lead_assignments.status",
          "contacts.id as contactId",
          "contacts.name",
          "contacts.dni",
          "contacts.phone_primary as phonePrimary",
          "contacts.organization_id as organizationId",
        ])
        .where("lead_assignments.user_id", "=", userId)
        .where("lead_assignments.status", "=", "active")
        .where("lead_assignments.expires_at", ">", Date.now())
        .orderBy("lead_assignments.assigned_at", "desc")
        .execute()
        .then((rows) =>
          rows.map((row) => ({
            ...row,
            assignmentId: asAssignmentId(row.assignmentId),
            contactId: asContactId(row.contactId),
            organizationId: asOrganizationId(row.organizationId),
          })),
        );
    },

    async countActiveByUser(userId: UserId) {
      const rows = await this.findActiveByUser(userId);
      return rows.length;
    },

    async countActiveByUsers(userIds: UserId[]) {
      if (userIds.length === 0) {
        return [] as Array<{ userId: UserId; activeCount: number }>;
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
        userId: asUserId(row.userId),
        activeCount: row.activeCount,
      }));
    },

    findActiveForContact(userId: UserId, contactId: ContactId) {
      return db
        .selectFrom("lead_assignments")
        .selectAll()
        .where("user_id", "=", userId)
        .where("contact_id", "=", contactId)
        .where("status", "=", "active")
        .where("expires_at", ">", Date.now())
        .executeTakeFirst()
        .then((row) =>
          row
            ? {
                ...row,
                id: asAssignmentId(row.id),
                user_id: asUserId(row.user_id),
                contact_id: asContactId(row.contact_id),
              }
            : undefined,
        );
    },

    async hasActiveForContact(userId: UserId, contactId: ContactId) {
      const row = await this.findActiveForContact(userId, contactId);
      return !!row;
    },

    findActiveByIdForUser(id: AssignmentId, userId: UserId) {
      return db
        .selectFrom("lead_assignments")
        .selectAll()
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .where("status", "=", "active")
        .where("expires_at", ">", Date.now())
        .executeTakeFirst()
        .then((row) =>
          row
            ? {
                ...row,
                id: asAssignmentId(row.id),
                user_id: asUserId(row.user_id),
                contact_id: asContactId(row.contact_id),
              }
            : undefined,
        );
    },

    markCompleted(id: AssignmentId, userId: UserId) {
      return db
        .updateTable("lead_assignments")
        .set({ status: "completed" })
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .execute();
    },
  };
}
