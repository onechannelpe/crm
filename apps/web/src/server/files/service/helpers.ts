import { createHash } from "node:crypto";

import type { AppContext } from "~/server/shared/action-runtime";

import type { PolicyActor } from "../policy";
import type { ArtifactEventRepo } from "./contracts";

export function actorFromCtx(ctx: AppContext): PolicyActor {
  return {
    userId: ctx.actor.userId,
    role: ctx.actor.role,
    branchId: ctx.actor.branchId,
  };
}

export function buildPolicySnapshot(actor: PolicyActor): string {
  return JSON.stringify({
    userId: actor.userId,
    role: actor.role,
    branchId: actor.branchId,
  });
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function emitEvent(
  repo: ArtifactEventRepo,
  artifactId: number,
  eventType: string,
  ctx: AppContext,
  details: Record<string, unknown> = {},
): Promise<void> {
  await repo.insertEvent({
    artifactId,
    eventType,
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    requestId: ctx.requestId,
    traceId: ctx.traceId,
    ipHash: hashIp(ctx.ipAddress),
    userAgent: ctx.userAgent ?? null,
    details,
    now: ctx.now(),
  });
}

export const DOWNLOAD_READY_STATUSES = new Set(["ready", "completed"]);
