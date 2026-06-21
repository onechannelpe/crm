import { parseFieldChanges } from "~/contracts/events";
import { AUDIT_READER_DEFAULT_LIMIT } from "~/server/audit-reader/limits";
import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import type { EventsRepo } from "~/server/shared/repos-events";
import { Ok, type Result } from "~/server/shared/result";

import type { CapacityAuditEvent } from "../contracts";

interface AuditReadDeps {
  repos: {
    events: Pick<EventsRepo, "listRecent">;
    users: {
      findByBranchIncludingInactive(
        branchId: number,
      ): Promise<Array<{ id: number }>>;
    };
    teams: {
      findByBranch(branchId: number): Promise<Array<{ id: number }>>;
    };
  };
}

export async function getAuditEvents(
  ctx: AppContext,
  deps: AuditReadDeps,
  input: { limit?: number },
): Promise<Result<CapacityAuditEvent[], DomainError>> {
  const effectiveLimit = Math.max(1, input.limit ?? AUDIT_READER_DEFAULT_LIMIT);
  const now = Date.now();
  const [recent, branchUsers, branchTeams] = await Promise.all([
    deps.repos.events.listRecent({
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
        event.type.startsWith("search_") ||
        event.type.startsWith("lead_") ||
        event.type.startsWith("capacity_"),
    )
    .filter((event) => {
      if (ctx.actor.role === "superuser") return true;
      if (ctx.actor.role !== "admin") return false;
      if (event.entity_type === "branch") {
        return event.entity_id === String(ctx.actor.branchId);
      }
      if (event.entity_type === "team") {
        return branchTeamIds.has(Number(event.entity_id));
      }
      if (event.entity_type === "user") {
        return branchUserIds.has(Number(event.entity_id));
      }
      return false;
    })
    .map((event) => ({
      id: event.id,
      createdAt: event.occurred_at,
      actorUserId: event.actor_user_id,
      type: event.type,
      entityType: event.entity_type,
      entityId: event.entity_id,
      changes: parseFieldChanges(event.changes_json),
      payload: event.payload_json,
    }));

  return Ok(filtered);
}
