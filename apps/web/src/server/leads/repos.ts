import type { Kysely } from "kysely";
import type { Database, NewLeadAssignment } from "~/lib/db/schema";

export function createLeadAssignmentsRepo(db: Kysely<Database>) {
    return {
        create(values: NewLeadAssignment) {
            return db.insertInto("lead_assignments").values(values).executeTakeFirstOrThrow();
        },

        createMany(assignments: NewLeadAssignment[]) {
            if (assignments.length === 0) return Promise.resolve();
            return db.insertInto("lead_assignments").values(assignments).execute();
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
