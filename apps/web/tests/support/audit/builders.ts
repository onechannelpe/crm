import type { TestDbContext } from "@tests/support/runtime/db";

import type { WireKind } from "~/lib/wire-error";
import type { UserId } from "~/server/shared/ids";

export async function seedEvent(
  ctx: TestDbContext,
  input: {
    actorUserId: UserId;
    type: string;
    entityType: string;
    entityId: string;
    payload?: unknown;
    occurredAt: Date;
  },
): Promise<void> {
  await ctx.repos.events.append({
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actorUserId,
    payload: input.payload,
    occurredAt: input.occurredAt,
  });
}

export type ActionObservationSeed = {
  traceId: string;
  requestId: string;
  routePath: string;
  actionName: string;
  actorUserId: UserId;
  actorRole: "executive" | "superuser";
  status: "ok" | "error";
  durationMs: number;
  createdAt: Date;
  errorCode?: WireKind | null;
  errorMessage?: string | null;
  input?: Record<string, unknown>;
};
