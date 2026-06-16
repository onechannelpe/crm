import type { TestDbContext } from "@tests/support/runtime/db";

import type { WireKind } from "~/lib/wire-error";

export async function seedEvent(
  ctx: TestDbContext,
  input: {
    actorUserId: number;
    type: string;
    entityType: string;
    entityId: number;
    payload?: unknown;
    occurredAt: number;
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
  actorUserId: number;
  actorRole: "executive" | "superuser";
  status: "ok" | "error";
  durationMs: number;
  createdAt: number;
  errorCode?: WireKind | null;
  errorMessage?: string | null;
  input?: Record<string, unknown>;
};
