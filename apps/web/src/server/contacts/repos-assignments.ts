import type { Insertable, Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { ContactAssignmentDraft } from "~/server/contact-assignments/domain/assignment";
import type {
  ContactAssignmentId,
  OrganizationPersonId,
  UserId,
} from "~/server/shared/ids";

type NewLeadAssignmentRow = Insertable<Database["lead_assignments"]>;

export function createContactAssignmentsRepo(db: Kysely<Database>) {
  const create = (values: NewLeadAssignmentRow) =>
    db.insertInto("lead_assignments").values(values).executeTakeFirstOrThrow();

  const createMany = async (
    assignments: ContactAssignmentDraft[],
  ): Promise<void> => {
    if (assignments.length === 0) return;
    await db.insertInto("lead_assignments").values(assignments).execute();
  };

  const findActiveByUser = (userId: UserId) =>
    db
      .selectFrom("lead_assignments")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "=", "active")
      .where("expires_at", ">", new Date())
      .execute();

  const findActiveByUserWithContacts = (userId: UserId) =>
    db
      .selectFrom("lead_assignments")
      .innerJoin(
        "organization_people",
        "organization_people.id",
        "lead_assignments.contact_id",
      )
      .innerJoin("people", "people.id", "organization_people.person_id")
      .select([
        "lead_assignments.id as assignmentId",
        "lead_assignments.assigned_at as assignedAt",
        "lead_assignments.expires_at as expiresAt",
        "lead_assignments.status",
        "organization_people.id as contactId",
        "people.full_name as name",
        "organization_people.dni",
        "organization_people.telefono as phonePrimary",
        "organization_people.organization_id as organizationId",
      ])
      .where("lead_assignments.user_id", "=", userId)
      .where("lead_assignments.status", "=", "active")
      .where("lead_assignments.expires_at", ">", new Date())
      .orderBy("lead_assignments.assigned_at", "desc")
      .execute();

  const countActiveByUser = async (userId: UserId) => {
    const rows = await findActiveByUser(userId);
    return rows.length;
  };

  const countActiveByUsers = async (userIds: UserId[]) => {
    if (userIds.length === 0) {
      return [] as Array<{ userId: UserId; activeCount: number }>;
    }

    const rows = await db
      .selectFrom("lead_assignments")
      .select((eb) => [
        "user_id as userId",
        eb.fn.count<number>("id").as("activeCount"),
      ])
      .where("user_id", "in", userIds)
      .where("status", "=", "active")
      .where("expires_at", ">", new Date())
      .groupBy("user_id")
      .execute();

    return rows.map((row) => ({
      userId: row.userId,
      activeCount: row.activeCount,
    }));
  };

  const findActiveForContact = (
    userId: UserId,
    contactId: OrganizationPersonId,
  ) =>
    db
      .selectFrom("lead_assignments")
      .selectAll()
      .where("user_id", "=", userId)
      .where("contact_id", "=", contactId)
      .where("status", "=", "active")
      .where("expires_at", ">", new Date())
      .executeTakeFirst();

  const hasActiveForContact = async (
    userId: UserId,
    contactId: OrganizationPersonId,
  ) => {
    const row = await findActiveForContact(userId, contactId);
    return !!row;
  };

  const findActiveByIdForUser = (id: ContactAssignmentId, userId: UserId) =>
    db
      .selectFrom("lead_assignments")
      .selectAll()
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .where("status", "=", "active")
      .where("expires_at", ">", new Date())
      .executeTakeFirst();

  const markCompleted = (id: ContactAssignmentId, userId: UserId) =>
    db
      .updateTable("lead_assignments")
      .set({ status: "completed" })
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .execute();

  return {
    create,
    createMany,
    findActiveByUser,
    findActiveByUserWithContacts,
    countActiveByUser,
    countActiveByUsers,
    findActiveForContact,
    hasActiveForContact,
    findActiveByIdForUser,
    markCompleted,
  };
}

export type ContactAssignmentsRepo = ReturnType<
  typeof createContactAssignmentsRepo
>;
