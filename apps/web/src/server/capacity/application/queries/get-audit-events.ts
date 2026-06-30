import type { CapacityAuditEvent } from "~/contracts/capacity";
import { parseFieldChanges } from "~/contracts/events";
import { AUDIT_READER_DEFAULT_LIMIT } from "~/server/audit-reader/limits";
import type { CapacityTeamsRepo } from "~/server/capacity/infrastructure/capacity-teams-repo";
import type { CapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import type { EventsRepo } from "~/server/shared/repos-events";
import { Ok, type Result } from "~/server/shared/result";
import { addMilliseconds, epochMilliseconds } from "~/server/shared/time";

interface AuditReadDeps {
  repos: {
    events: Pick<EventsRepo, "listRecent">;
    users: Pick<CapacityUsersRepo, "findByBranchIncludingInactive">;
    teams: Pick<CapacityTeamsRepo, "findByBranch">;
  };
}

export async function getAuditEvents(
  ctx: AppContext,
  deps: AuditReadDeps,
  input: { limit?: number },
): Promise<Result<CapacityAuditEvent[], DomainError>> {
  const effectiveLimit = Math.max(1, input.limit ?? AUDIT_READER_DEFAULT_LIMIT);
  const now = new Date();
  const [recent, branchUsers, branchTeams] = await Promise.all([
    deps.repos.events.listRecent({
      fromInclusive: addMilliseconds(now, -1000 * 60 * 60 * 24 * 30),
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
  const branchUserIds = new Set<string>(branchUsers.map((user) => user.id));
  const branchTeamIds = new Set<string>(branchTeams.map((team) => team.id));

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
        return event.entity_id === ctx.actor.branchId;
      }
      if (event.entity_type === "team") {
        return branchTeamIds.has(event.entity_id);
      }
      if (event.entity_type === "user") {
        return branchUserIds.has(event.entity_id);
      }
      return false;
    })
    .map((event) => ({
      id: event.id,
      createdAt: epochMilliseconds(event.occurred_at),
      actorUserId: event.actor_user_id,
      type: event.type,
      entityType: event.entity_type,
      entityId: event.entity_id,
      changes: parseFieldChanges(event.changes_json),
      payload: event.payload_json,
    }));

  return Ok(filtered);
}
