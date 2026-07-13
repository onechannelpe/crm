import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

export function createMemberWorkloadRepo(db: DatabaseExecutor) {
  return {
    async countActiveLeads(executiveId: UserId): Promise<number> {
      const row = await db
        .selectFrom("workflow_leads")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("executive_id", "=", executiveId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      return row?.count ?? 0;
    },
  };
}

export type MemberWorkloadRepo = ReturnType<typeof createMemberWorkloadRepo>;
