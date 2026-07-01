import type { Insertable, Kysely } from "kysely";

import { personDisplayName } from "~/lib/users/display-name";
import type { Database } from "~/lib/db/types";
import type { ContactAssignmentDraft } from "~/server/contact-assignments/domain/assignment";
import type {
  ContactAssignmentId,
  OrganizationPersonId,
  UserId,
} from "~/server/shared/ids";

type NewContactAssignmentRow = Insertable<Database["contact_assignments"]>;

export function createContactAssignmentsRepo(db: Kysely<Database>) {
  const create = (values: NewContactAssignmentRow) =>
    db
      .insertInto("contact_assignments")
      .values(values)
      .executeTakeFirstOrThrow();

  const createMany = async (
    assignments: ContactAssignmentDraft[],
  ): Promise<void> => {
    if (assignments.length === 0) return;
    await db.insertInto("contact_assignments").values(assignments).execute();
  };

  const findActiveByUser = (userId: UserId) =>
    db
      .selectFrom("contact_assignments")
      .selectAll()
      .where("user_id", "=", userId)
      .where("status", "=", "active")
      .where("expires_at", ">", new Date())
      .execute();

  const findActiveByUserWithContacts = async (userId: UserId) => {
    const rows = await db
      .selectFrom("contact_assignments")
      .innerJoin(
        "organization_people",
        "organization_people.id",
        "contact_assignments.contact_id",
      )
      .innerJoin("people", "people.id", "organization_people.person_id")
      .select([
        "contact_assignments.id as assignmentId",
        "contact_assignments.assigned_at as assignedAt",
        "contact_assignments.expires_at as expiresAt",
        "contact_assignments.status as status",
        "organization_people.id as contactId",
        "people.names as names",
        "people.first_surname as firstSurname",
        "people.second_surname as secondSurname",
        "people.dni as dni",
        "organization_people.phone as phonePrimary",
        "organization_people.organization_id as organizationId",
      ])
      .where("contact_assignments.user_id", "=", userId)
      .where("contact_assignments.status", "=", "active")
      .where("contact_assignments.expires_at", ">", new Date())
      .orderBy("contact_assignments.assigned_at", "desc")
      .execute();

    return rows.map((row) => ({
      assignmentId: row.assignmentId,
      assignedAt: row.assignedAt,
      expiresAt: row.expiresAt,
      status: row.status,
      contactId: row.contactId,
      name: personDisplayName({
        names: row.names,
        first_surname: row.firstSurname,
        second_surname: row.secondSurname,
      }),
      dni: row.dni,
      phonePrimary: row.phonePrimary,
      organizationId: row.organizationId,
    }));
  };

  const countActiveByUser = async (userId: UserId) => {
    const rows = await findActiveByUser(userId);
    return rows.length;
  };

  const countActiveByUsers = async (userIds: UserId[]) => {
    if (userIds.length === 0) {
      return [] as Array<{ userId: UserId; activeCount: number }>;
    }

    const rows = await db
      .selectFrom("contact_assignments")
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
      .selectFrom("contact_assignments")
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
      .selectFrom("contact_assignments")
      .selectAll()
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .where("status", "=", "active")
      .where("expires_at", ">", new Date())
      .executeTakeFirst();

  const markCompleted = (id: ContactAssignmentId, userId: UserId) =>
    db
      .updateTable("contact_assignments")
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
