import type { Kysely } from "kysely";

import type { Database, ChargeNotesTable } from "~/lib/db/schema";

type NoteStatus = ChargeNotesTable["status"];

export function createChargeNotesRepo(db: Kysely<Database>) {
  return {
    findById(id: number) {
      return db
        .selectFrom("charge_notes")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByIdWithOwner(id: number) {
      return db
        .selectFrom("charge_notes")
        .innerJoin("users", "users.id", "charge_notes.user_id")
        .select([
          "charge_notes.id",
          "charge_notes.contact_id",
          "charge_notes.user_id",
          "charge_notes.status",
          "charge_notes.exec_code_real",
          "charge_notes.exec_code_tdp",
          "charge_notes.created_at",
          "charge_notes.updated_at",
          "users.branch_id as owner_branch_id",
        ])
        .where("charge_notes.id", "=", id)
        .executeTakeFirst();
    },

    async create(contactId: number, userId: number) {
      const now = Date.now();
      const result = await db
        .insertInto("charge_notes")
        .values({
          contact_id: contactId,
          user_id: userId,
          status: "draft",
          created_at: now,
          updated_at: now,
        })
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    updateStatus(id: number, status: NoteStatus) {
      return db
        .updateTable("charge_notes")
        .set({ status, updated_at: Date.now() })
        .where("id", "=", id)
        .execute();
    },

    findByUser(userId: number) {
      return db
        .selectFrom("charge_notes")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("updated_at", "desc")
        .execute();
    },

    findPendingConfirmation() {
      return db
        .selectFrom("charge_notes")
        .selectAll()
        .where("status", "=", "pending_confirmation")
        .orderBy("created_at", "asc")
        .execute();
    },

    findPendingConfirmationWithContacts() {
      return db
        .selectFrom("charge_notes")
        .innerJoin("contacts", "contacts.id", "charge_notes.contact_id")
        .innerJoin("users", "users.id", "charge_notes.user_id")
        .select([
          "charge_notes.id",
          "charge_notes.status",
          "charge_notes.created_at",
          "charge_notes.updated_at",
          "contacts.name as contactName",
          "contacts.dni as contactDni",
          "users.full_name as executiveName",
        ])
        .where("charge_notes.status", "=", "pending_confirmation")
        .orderBy("charge_notes.created_at", "asc")
        .execute();
    },

    findPendingConfirmationWithContactsByBranch(branchId: number) {
      return db
        .selectFrom("charge_notes")
        .innerJoin("contacts", "contacts.id", "charge_notes.contact_id")
        .innerJoin("users", "users.id", "charge_notes.user_id")
        .select([
          "charge_notes.id",
          "charge_notes.status",
          "charge_notes.created_at",
          "charge_notes.updated_at",
          "contacts.name as contactName",
          "contacts.dni as contactDni",
          "users.full_name as executiveName",
        ])
        .where("charge_notes.status", "=", "pending_confirmation")
        .where("users.branch_id", "=", branchId)
        .orderBy("charge_notes.created_at", "asc")
        .execute();
    },

    async countByUserAndStatus(userId: number, status: NoteStatus) {
      const result = await db
        .selectFrom("charge_notes")
        .select(db.fn.countAll().as("count"))
        .where("user_id", "=", userId)
        .where("status", "=", status)
        .executeTakeFirst();
      return Number(result?.count ?? 0);
    },

    async countPendingConfirmation() {
      const result = await db
        .selectFrom("charge_notes")
        .select(db.fn.countAll().as("count"))
        .where("status", "=", "pending_confirmation")
        .executeTakeFirst();
      return Number(result?.count ?? 0);
    },

    findConfirmedWithContacts() {
      return db
        .selectFrom("charge_notes")
        .innerJoin("contacts", "contacts.id", "charge_notes.contact_id")
        .innerJoin("users", "users.id", "charge_notes.user_id")
        .innerJoin(
          "organizations",
          "organizations.id",
          "contacts.organization_id",
        )
        .select([
          "charge_notes.id",
          "charge_notes.status",
          "charge_notes.created_at",
          "charge_notes.updated_at",
          "contacts.name as contactName",
          "contacts.dni as contactDni",
          "organizations.name as companyName",
          "users.full_name as executiveName",
        ])
        .where("charge_notes.status", "=", "confirmed")
        .orderBy("charge_notes.updated_at", "desc")
        .execute();
    },

    findConfirmedWithContactsByBranch(branchId: number) {
      return db
        .selectFrom("charge_notes")
        .innerJoin("contacts", "contacts.id", "charge_notes.contact_id")
        .innerJoin("users", "users.id", "charge_notes.user_id")
        .innerJoin(
          "organizations",
          "organizations.id",
          "contacts.organization_id",
        )
        .select([
          "charge_notes.id",
          "charge_notes.status",
          "charge_notes.created_at",
          "charge_notes.updated_at",
          "contacts.name as contactName",
          "contacts.dni as contactDni",
          "organizations.name as companyName",
          "users.full_name as executiveName",
        ])
        .where("charge_notes.status", "=", "confirmed")
        .where("users.branch_id", "=", branchId)
        .orderBy("charge_notes.updated_at", "desc")
        .execute();
    },

    findConfirmedWithContactsByUser(userId: number) {
      return db
        .selectFrom("charge_notes")
        .innerJoin("contacts", "contacts.id", "charge_notes.contact_id")
        .innerJoin("users", "users.id", "charge_notes.user_id")
        .innerJoin(
          "organizations",
          "organizations.id",
          "contacts.organization_id",
        )
        .select([
          "charge_notes.id",
          "charge_notes.status",
          "charge_notes.created_at",
          "charge_notes.updated_at",
          "contacts.name as contactName",
          "contacts.dni as contactDni",
          "organizations.name as companyName",
          "users.full_name as executiveName",
        ])
        .where("charge_notes.status", "=", "confirmed")
        .where("charge_notes.user_id", "=", userId)
        .orderBy("charge_notes.updated_at", "desc")
        .execute();
    },
  };
}
