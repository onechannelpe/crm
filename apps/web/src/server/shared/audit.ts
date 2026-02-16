import { serializeAuditChanges } from "~/lib/contracts/audit";
import type { Repositories } from "~/server/shared/registry";

type AuditRepos = Pick<Repositories, "auditLogs">;

export function createAuditService(repos: AuditRepos) {
  return {
    log(
      userId: number,
      action: string,
      entityType: string,
      entityId: number,
      changes?: unknown,
    ) {
      return repos.auditLogs.create({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes: serializeAuditChanges(changes),
        created_at: Date.now(),
      });
    },
  };
}
