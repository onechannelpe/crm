import type { TestDbContext } from "@tests/support/runtime/db";

import type { WireKind } from "~/lib/wire-error";

export async function seedAuditLog(
  ctx: TestDbContext,
  input: {
    userId: number;
    action: string;
    entityType: string;
    entityId: number;
    changes: string;
    createdAt: number;
  },
): Promise<void> {
  await ctx.repos.auditLogs.create({
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    changes: input.changes,
    created_at: input.createdAt,
  });
}

export type ActionObservationSeed = {
  traceId: string;
  requestId: string;
  routePath: string;
  actionName: string;
  actorUserId: number;
  actorRole: "executive" | "superuser";
  status: "ok" | "error";
  durationMs: number;
  createdAt: number;
  errorCode?: WireKind | null;
  errorMessage?: string | null;
  input?: Record<string, unknown>;
};
