import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadFavoriteRepository } from "~/server/workflow/infrastructure/ports/lead";

export function createLeadFavoriteRepo(
  db: DatabaseExecutor,
): LeadFavoriteRepository {
  return {
    async isFavoriteForUser(input) {
      const row = await db
        .selectFrom("workflow_lead_favorites")
        .select("lead_id")
        .where("lead_id", "=", input.leadId)
        .where("user_id", "=", input.userId)
        .executeTakeFirst();

      return row !== undefined;
    },

    async addForUser(input) {
      await db
        .insertInto("workflow_lead_favorites")
        .values({
          lead_id: input.leadId,
          user_id: input.userId,
          created_at: input.createdAt,
        })
        .onConflict((oc) => oc.columns(["lead_id", "user_id"]).doNothing())
        .executeTakeFirst();
    },

    async removeForUser(input) {
      await db
        .deleteFrom("workflow_lead_favorites")
        .where("lead_id", "=", input.leadId)
        .where("user_id", "=", input.userId)
        .executeTakeFirst();
    },
  };
}
