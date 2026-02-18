import type { Role } from "~/lib/auth/access/rbac";
import { serializeAuditChanges } from "~/lib/contracts/audit";
import type { Repositories } from "~/server/shared/registry";

interface ObservabilityRepos {
  actionObservations: Repositories["actionObservations"];
}

export interface RecordActionObservationInput {
  traceId: string;
  requestId: string;
  routePath: string | null;
  httpMethod: string | null;
  actionName: string;
  actorUserId: number | null;
  actorRole: Role | null;
  status: "ok" | "error";
  durationMs: number;
  errorMessage: string | null;
  input: unknown;
  createdAt: number;
}

function summarizeInput(input: unknown): string | null {
  const serialized = serializeAuditChanges(input);
  if (!serialized) return null;
  if (serialized.length <= 400) return serialized;
  return `${serialized.slice(0, 400)}…`;
}

function classifyError(message: string | null): string | null {
  if (!message) return null;
  const normalized = message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return normalized || null;
}

export function createObservabilityService(repos: ObservabilityRepos) {
  return {
    async recordAction(input: RecordActionObservationInput): Promise<void> {
      await repos.actionObservations.create({
        trace_id: input.traceId,
        request_id: input.requestId,
        route_path: input.routePath,
        http_method: input.httpMethod,
        action_name: input.actionName,
        actor_user_id: input.actorUserId,
        actor_role: input.actorRole,
        status: input.status,
        duration_ms: Math.max(0, Math.round(input.durationMs)),
        error_code: classifyError(input.errorMessage),
        error_message: input.errorMessage?.slice(0, 255) ?? null,
        input_summary: summarizeInput(input.input),
        created_at: input.createdAt,
      });
    },

    async listRecent(params: {
      fromInclusive: number;
      toInclusive: number;
      actionName?: string;
      status?: "ok" | "error";
      actorUserId?: number;
      limit: number;
    }) {
      return repos.actionObservations.findRecent(params);
    },

    async summarizeByAction(params: {
      fromInclusive: number;
      toInclusive: number;
    }) {
      return repos.actionObservations.summarizeByAction(params);
    },
  };
}
