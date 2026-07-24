import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

export function createMemberWorkloadRepo(db: DatabaseExecutor) {
  return {
    async countActiveLeads(executiveId: UserId): Promise<number> {
      const row = await db
        .selectFrom("workflow_leads as lead")
        .innerJoin(
          "organization_current_owners as owner",
          "owner.organization_id",
          "lead.organization_id",
        )
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("owner.executive_id", "=", executiveId)
        .where("lead.deleted_at", "is", null)
        .executeTakeFirst();

      return row?.count ?? 0;
    },
  };
}

export type MemberWorkloadRepo = ReturnType<typeof createMemberWorkloadRepo>;
