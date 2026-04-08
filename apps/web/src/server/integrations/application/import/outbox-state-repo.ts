import type { DatabaseExecutor } from "~/server/shared/db-executor";

type OutboxTableName =
  | "pipeline_integration_outbox_needs_executive_input"
  | "pipeline_integration_outbox_ready_for_quotation";

export function createOutboxStateRepo(
  executor: DatabaseExecutor,
  tableName: OutboxTableName,
) {
  return {
    async extendLease(id: number, workerId: string, leaseMs: number) {
      const now = Date.now();
      const result = await executor
        .updateTable(tableName)
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("status", "=", "processing")
        .where("lease_owner", "=", workerId)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    async markCompleted(id: number) {
      await executor
        .updateTable(tableName)
        .set({
          status: "completed",
          processed_at: Date.now(),
          lease_owner: null,
          lease_until: null,
          error_message: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async scheduleRetry(id: number, availableAt: number) {
      await executor
        .updateTable(tableName)
        .set({
          status: "pending",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async markFailed(id: number, reason: string) {
      await executor
        .updateTable(tableName)
        .set({
          status: "failed",
          error_message: reason,
          processed_at: Date.now(),
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },
  };
}
