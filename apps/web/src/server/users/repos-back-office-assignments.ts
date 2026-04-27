import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createBackOfficeAssignmentsRepo(db: Kysely<Database>) {
  return {
    async findTeamsByBackOffice(backOfficeUserId: number) {
      const rows = await db
        .selectFrom("back_office_assignments")
        .select(["team_id"])
        .where("back_office_user_id", "=", backOfficeUserId)
        .execute();

      return rows.map((r) => r.team_id);
    },

    async assign(backOfficeUserId: number, teamId: number, now: number) {
      await db
        .insertInto("back_office_assignments")
        .values({
          back_office_user_id: backOfficeUserId,
          team_id: teamId,
          assigned_at: now,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    },
  };
}
