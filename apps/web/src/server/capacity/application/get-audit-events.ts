import { isPlainRecord } from "~/lib/type-guards";
import { AUDIT_READER_DEFAULT_LIMIT } from "~/server/audit-reader/contracts";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { isBranchId, isTeamId, isUserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityReadContext } from "../infrastructure/read-context";
import type { CapacityAuditEvent, AuditChangeValue } from "./contracts";

function isAuditScalar(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isAuditChangeValue(value: unknown): value is AuditChangeValue {
  if (isAuditScalar(value)) return true;
  if (Array.isArray(value)) return value.every(isAuditChangeValue);
  if (isPlainRecord(value)) {
    return Object.values(value).every(isAuditChangeValue);
  }
  return false;
}

function parseAuditChanges(raw: unknown): AuditChangeValue {
  if (isAuditScalar(raw)) return raw;
  if (typeof raw !== "string") {
    try {
      const parsed: unknown = JSON.parse(JSON.stringify(raw));
      return isAuditChangeValue(parsed) ? parsed : JSON.stringify(raw);
    } catch {
      return "[unserializable_changes]";
    }
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAuditChangeValue(parsed) ? parsed : raw;
  } catch {
    return raw;
  }
}

export async function getAuditEvents(
  ctx: AppContext,
  deps: CapacityReadContext,
  input: { limit?: number },
): Promise<Result<CapacityAuditEvent[], DomainError>> {
  try {
    const effectiveLimit = Math.max(
      1,
      input.limit ?? AUDIT_READER_DEFAULT_LIMIT,
    );
    const now = Date.now();
    const [recent, branchUsers, branchTeams] = await Promise.all([
      deps.repos.auditLogs.listRecent({
        fromInclusive: now - 1000 * 60 * 60 * 24 * 30,
        toInclusive: now,
        limit: effectiveLimit,
      }),
      ctx.actor.role === "admin"
        ? deps.repos.users.findByBranchIncludingInactive(ctx.actor.branchId)
        : Promise.resolve([]),
      ctx.actor.role === "admin"
        ? deps.repos.teams.findByBranch(ctx.actor.branchId)
        : Promise.resolve([]),
    ]);
    const branchUserIds = new Set(branchUsers.map((user) => user.id));
    const branchTeamIds = new Set(branchTeams.map((team) => team.id));

    const filtered = recent
      .filter(
        (event) =>
          event.action.startsWith("search_") ||
          event.action.startsWith("lead_") ||
          event.action.startsWith("capacity_"),
      )
      .filter((event) => {
        if (ctx.actor.role === "superuser") return true;
        if (ctx.actor.role !== "admin") return false;
        if (event.entity_type === "branch") {
          return (
            isBranchId(event.entity_id) &&
            event.entity_id === ctx.actor.branchId
          );
        }
        if (event.entity_type === "team") {
          return (
            isTeamId(event.entity_id) && branchTeamIds.has(event.entity_id)
          );
        }
        if (event.entity_type === "user") {
          return (
            isUserId(event.entity_id) && branchUserIds.has(event.entity_id)
          );
        }
        return false;
      })
      .map((event) => ({
        id: Number(event.id),
        createdAt: event.created_at,
        userId: event.user_id,
        action: event.action,
        entityType: event.entity_type,
        entityId: event.entity_id,
        changes: parseAuditChanges(event.changes),
      }));

    return Ok(filtered);
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Failed to list audit events",
      ),
    );
  }
}
