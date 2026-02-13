import type { Repositories } from "~/server/shared/registry";

export function createAuditService(repos: Repositories) {
    return {
        log(userId: number, action: string, entityType: string, entityId: number, changes?: unknown) {
            return repos.auditLogs.create({
                user_id: userId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                changes: changes ? JSON.stringify(changes) : null,
                created_at: Date.now(),
            });
        },
    };
}
