import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type PipelineLeadInteractionRow = Selectable<
  Database["pipeline_lead_interactions"]
>;
export type NewPipelineLeadInteractionRow = Insertable<
  Database["pipeline_lead_interactions"]
>;

export function createPipelineLeadInteractionRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewPipelineLeadInteractionRow) {
      const result = await db
        .insertInto("pipeline_lead_interactions")
        .values(values)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    listByLeadId(leadId: number) {
      return db
        .selectFrom("pipeline_lead_interactions as interaction")
        .leftJoin("users as actor", "actor.id", "interaction.created_by")
        .select([
          "interaction.id",
          "interaction.lead_id",
          "interaction.kind",
          "interaction.outcome",
          "interaction.body_text",
          "interaction.created_by",
          "interaction.created_at",
          "actor.names as actor_names",
          "actor.first_surname as actor_first_surname",
          "actor.second_surname as actor_second_surname",
        ])
        .where("interaction.lead_id", "=", leadId)
        .orderBy("interaction.created_at", "desc")
        .execute();
    },
  };
}
