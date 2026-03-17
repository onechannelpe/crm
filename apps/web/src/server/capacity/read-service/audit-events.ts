import type { SessionData } from "~/lib/auth/access/session";
import { AUDIT_READER_DEFAULT_LIMIT } from "~/server/audit-reader/contracts";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityReadError } from "../errors";
import type { AuditChangeValue, CapacityAuditEvent } from "./contracts";

function isAuditChangeValue(value: unknown): value is AuditChangeValue {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((entry) => isAuditChangeValue(entry));
  }

  if (typeof value !== "object") {
    return false;
  }

  return Object.values(value).every((entry) => isAuditChangeValue(entry));
}

function parseAuditChanges(rawChanges: unknown): AuditChangeValue {
  if (rawChanges == null) {
    return null;
  }

  if (isAuditChangeValue(rawChanges)) {
    return rawChanges;
  }

  if (typeof rawChanges !== "string") {
    return String(rawChanges);
  }

  try {
    const parsed: unknown = JSON.parse(rawChanges);
    return isAuditChangeValue(parsed) ? parsed : rawChanges;
  } catch {
    return rawChanges;
  }
}

function canViewCapacityAuditEvent(input: {
  session: SessionData;
  event: { entity_type: string; entity_id: number | null };
  branchUserIds?: ReadonlySet<number>;
  branchTeamIds?: ReadonlySet<number>;
}) {
  const { session, event, branchUserIds, branchTeamIds } = input;

  if (session.role === "superuser") {
    return true;
  }

  if (session.role === "admin") {
    switch (event.entity_type) {
      case "branch":
        return event.entity_id === session.branchId;
      case "team":
        return (
          event.entity_id != null &&
          branchTeamIds?.has(event.entity_id) === true
        );
      case "user":
        return (
          event.entity_id != null &&
          branchUserIds?.has(event.entity_id) === true
        );
      default:
        return false;
    }
  }

  return false;
}

export async function listCapacityAuditEvents(
  repos: Repositories,
  session: SessionData,
  limit?: number,
): Promise<Result<CapacityAuditEvent[], CapacityReadError>> {
  try {
    const effectiveLimit = Math.max(1, limit ?? AUDIT_READER_DEFAULT_LIMIT);
    const now = Date.now();
    const emptyBranchUsers: Awaited<
      ReturnType<typeof repos.users.findByBranchIncludingInactive>
    > = [];
    const emptyBranchTeams: Awaited<
      ReturnType<typeof repos.teams.findByBranch>
    > = [];

    const [recent, branchUsers, branchTeams] = await Promise.all([
      repos.auditLogs.listRecent({
        fromInclusive: now - 1000 * 60 * 60 * 24 * 30,
        toInclusive: now,
        limit: effectiveLimit,
      }),
      session.role === "admin"
        ? repos.users.findByBranchIncludingInactive(session.branchId)
        : Promise.resolve(emptyBranchUsers),
      session.role === "admin"
        ? repos.teams.findByBranch(session.branchId)
        : Promise.resolve(emptyBranchTeams),
    ]);
    const branchUserIds = new Set(branchUsers.map((user) => user.id));
    const branchTeamIds = new Set(branchTeams.map((team) => team.id));

    const filtered = recent
      .filter((event) => {
        const action = event.action;
        return (
          action.startsWith("search_") ||
          action.startsWith("lead_") ||
          action.startsWith("capacity_")
        );
      })
      .filter((event) =>
        canViewCapacityAuditEvent({
          session,
          event,
          branchUserIds,
          branchTeamIds,
        }),
      )
      .map((event) => ({
        id: event.id,
        createdAt: event.created_at,
        userId: event.user_id,
        action: event.action,
        entityType: event.entity_type,
        entityId: event.entity_id,
        changes: parseAuditChanges(event.changes),
      }));

    return Ok(filtered);
  } catch (error) {
    return Err({
      reason: "unexpected",
      message:
        error instanceof Error
          ? error.message
          : "Failed to list capacity audit events",
    });
  }
}
