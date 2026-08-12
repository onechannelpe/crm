import type { Kysely } from "kysely";

import type { TeamId, UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

export function createBackOfficeAssignmentsRepo(db: Kysely<Database>) {
  return {
    async findTeamsByBackOffice(backOfficeUserId: UserId) {
      const rows = await db
        .selectFrom("back_office_assignments")
        .select(["team_id"])
        .where("back_office_user_id", "=", backOfficeUserId)
        .execute();

      return rows.map((r) => r.team_id);
    },

    async assign(backOfficeUserId: UserId, teamId: TeamId, assignedAt: Date) {
      await db
        .insertInto("back_office_assignments")
        .values({
          back_office_user_id: backOfficeUserId,
          team_id: teamId,
          assigned_at: assignedAt,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
    },
  };
}
