import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

// Read-only view of the work a member still owns, used to guard destructive
// member actions. Deleting a user must not silently orphan their book of
// business, so we count the non-deleted leads assigned to them.
export function createMemberWorkloadRepo(db: DatabaseExecutor) {
  return {
    async countActiveLeads(executiveId: UserId): Promise<number> {
      const row = await db
        .selectFrom("workflow_leads")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("executive_id", "=", executiveId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      return Number(row?.count ?? 0);
    },
  };
}

export type MemberWorkloadRepo = ReturnType<typeof createMemberWorkloadRepo>;
