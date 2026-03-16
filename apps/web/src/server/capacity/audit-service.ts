import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface CapacityAuditEvent {
  id: number;
  createdAt: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: unknown;
}

export type CapacityAuditReadError = { reason: "unexpected"; message: string };

export function createCapacityAuditService(repos: Repositories) {
  return {
    async listRecentCapacityEvents(
      limit: number,
    ): Promise<Result<CapacityAuditEvent[], CapacityAuditReadError>> {
      try {
        const now = Date.now();
        const recent = await repos.auditLogs.listRecent({
          fromInclusive: now - 1000 * 60 * 60 * 24 * 30,
          toInclusive: now,
          limit,
        });

        const events = recent
          .filter((event) => {
            const action = event.action;
            return (
              action.startsWith("search_") ||
              action.startsWith("lead_") ||
              action.startsWith("capacity_")
            );
          })
          .map((event) => ({
            id: event.id,
            createdAt: event.created_at,
            userId: event.user_id,
            action: event.action,
            entityType: event.entity_type,
            entityId: event.entity_id,
            changes: event.changes,
          }));

        return Ok(events);
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to list capacity audit events",
        });
      }
    },
  };
}
