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

        async countActiveByUser(userId: number) {
            const rows = await this.findActiveByUser(userId);
            return rows.length;
        },

        markCompleted(id: number) {
            return db
                .updateTable("lead_assignments")
                .set({ status: "completed" })
                .where("id", "=", id)
                .execute();
        },
    };
}
