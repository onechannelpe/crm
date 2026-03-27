import { longName } from "~/lib/users/display-name";
import { AUDIT_READER_DEFAULT_LIMIT } from "~/server/audit-reader/contracts";
import {
  getLeadCapacityForUser,
  type LeadCapacitySnapshot,
} from "~/server/lead-workflow/read-lead-capacity";
import {
  getSearchCapacityForUser,
  type SearchCapacitySnapshot,
} from "~/server/search-workflow/read-search-capacity";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../domain/access-policy";
import { fromDbCapacityRequestKind } from "../domain/request-policy";
import type { CapacityRequestStatus } from "../domain/types";
import { capacityRepos } from "../infrastructure/runtime";

export type { SearchCapacitySnapshot, LeadCapacitySnapshot };

export type ManagedExecutiveSummary = {
  id: number;
  fullName: string;
  email: string;
  teamId: number | null;
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
};

export type ExecutiveCapacityDetail = {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
  };
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
  requests: Array<{
    id: number;
    user_id: number;
    kind: "search_extra" | "lead_refill";
    status: CapacityRequestStatus;
    requested_amount: number;
    reason: string;
    decision_note: string | null;
    reviewer_user_id: number | null;
    created_at: number;
    updated_at: number;
    decided_at: number | null;
  }>;
};

export type CapacityPolicyDefaults = {
  branchId: number;
  branchSearchLimit: number | null;
  branchActiveBufferTarget: number | null;
  branchDailyRefillLimit: number | null;
  teams: Array<{
    teamId: number;
    teamName: string;
    searchLimit: number | null;
    activeBufferTarget: number | null;
    dailyRefillLimit: number | null;
  }>;
};

export type AuditChangeValue =
  | string
  | number
  | boolean
  | null
  | AuditChangeValue[]
  | { [k: string]: AuditChangeValue };

export type CapacityAuditEvent = {
  id: number;
  createdAt: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: AuditChangeValue;
};

function isAuditChangeValue(v: unknown): v is AuditChangeValue {
  if (
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  )
    return true;
  if (Array.isArray(v)) return v.every(isAuditChangeValue);
  if (typeof v === "object" && v !== null)
    return Object.values(v).every(isAuditChangeValue);
  return false;
}

function parseAuditChanges(raw: unknown): AuditChangeValue {
  if (
    raw == null ||
    typeof raw === "string" ||
    typeof raw === "number" ||
    typeof raw === "boolean"
  )
    return raw ?? null;
  if (typeof raw !== "string") {
    try {
      const parsed: unknown = JSON.parse(JSON.stringify(raw));
      return isAuditChangeValue(parsed) ? parsed : JSON.stringify(raw);
    } catch {
      return JSON.stringify(raw);
    }
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAuditChangeValue(parsed) ? parsed : raw;
  } catch {
    return raw;
  }
}

export async function listManagedExecutives(
  ctx: AppContext,
): Promise<Result<ManagedExecutiveSummary[], DomainError>> {
  try {
    const users =
      ctx.actor.role === "superuser"
        ? await capacityRepos.users.findAllActive()
        : await capacityRepos.users.findByBranch(ctx.actor.branchId);

    const summaries = await Promise.all(
      users.map(async (user) => {
        const managed = await canManageExecutive(
          ctx.actor,
          user.id,
          capacityRepos,
        );
        if (!managed.ok) return null;

        const [searchStatus, leadStatus] = await Promise.all([
          getSearchCapacityForUser(user.id, capacityRepos),
          getLeadCapacityForUser(user.id, capacityRepos),
        ]);
        if (isErr(searchStatus) || isErr(leadStatus)) return null;

        return {
          id: user.id,
          fullName: longName(user),
          email: user.email,
          teamId: user.team_id,
          searchStatus: searchStatus.value,
          leadStatus: leadStatus.value,
        };
      }),
    );

    return Ok(
      summaries
        .filter((value): value is ManagedExecutiveSummary => value !== null)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    );
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to list managed executives",
      ),
    );
  }
}

export async function getExecutiveDetail(
  ctx: AppContext,
  input: { userId: number },
): Promise<Result<ExecutiveCapacityDetail, DomainError>> {
  try {
    const managed = await canManageExecutive(
      ctx.actor,
      input.userId,
      capacityRepos,
    );
    if (!managed.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }
    if (!managed.ok) {
      return Err(domainError("forbidden", "forbidden", "Forbidden"));
    }

    const [searchStatus, leadStatus, requests] = await Promise.all([
      getSearchCapacityForUser(input.userId, capacityRepos),
      getLeadCapacityForUser(input.userId, capacityRepos),
      capacityRepos.capacityRequests.listByUser(input.userId),
    ]);

    if (isErr(searchStatus)) return searchStatus;
    if (isErr(leadStatus)) return leadStatus;

    return Ok({
      executive: {
        id: input.userId,
        fullName: longName(managed.target),
        email: managed.target.email,
        teamId: managed.target.team_id,
      },
      searchStatus: searchStatus.value,
      leadStatus: leadStatus.value,
      requests: requests.map((request) => ({
        ...request,
        kind: fromDbCapacityRequestKind(request.kind),
      })),
    });
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to get executive capacity detail",
      ),
    );
  }
}

export async function listPendingRequests(ctx: AppContext): Promise<
  Result<
    Array<{
      id: number;
      user_id: number;
      kind: "search_extra" | "lead_refill";
      status: CapacityRequestStatus;
      requested_amount: number;
      reason: string;
      decision_note: string | null;
      reviewer_user_id: number | null;
      created_at: number;
      updated_at: number;
      decided_at: number | null;
      names: string;
      first_surname: string;
      second_surname: string;
      team_id: number | null;
      branch_id: number;
    }>,
    DomainError
  >
> {
  try {
    const pending = await capacityRepos.capacityRequests.listPendingByBranch(
      ctx.actor.branchId,
    );
    const scopedPending = pending.map((request) => ({
      ...request,
      kind: fromDbCapacityRequestKind(request.kind),
    }));
    if (ctx.actor.role !== "supervisor") return Ok(scopedPending);

    const supervisedTeam = await capacityRepos.teams.findBySupervisorId(
      ctx.actor.userId,
    );
    if (!supervisedTeam) return Ok([]);
    return Ok(
      scopedPending.filter((request) => request.team_id === supervisedTeam.id),
    );
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to list pending requests",
      ),
    );
  }
}

export async function getPolicyDefaults(
  ctx: AppContext,
): Promise<Result<CapacityPolicyDefaults, DomainError>> {
  try {
    const [teams, branchSearch, branchLead] = await Promise.all([
      capacityRepos.teams.findByBranch(ctx.actor.branchId),
      capacityRepos.searchPolicyDefaults.findForScope(
        "branch",
        ctx.actor.branchId,
      ),
      capacityRepos.leadPolicyDefaults.findForScope(
        "branch",
        ctx.actor.branchId,
      ),
    ]);
    const teamIds = teams.map((team) => team.id);
    const [searchTeamDefaults, leadTeamDefaults] = await Promise.all([
      capacityRepos.searchPolicyDefaults.listForScope("team", teamIds),
      capacityRepos.leadPolicyDefaults.listForScope("team", teamIds),
    ]);
    const searchTeamById = new Map(
      searchTeamDefaults.map((row) => [row.scope_id, row]),
    );
    const leadTeamById = new Map(
      leadTeamDefaults.map((row) => [row.scope_id, row]),
    );

    return Ok({
      branchId: ctx.actor.branchId,
      branchSearchLimit: branchSearch?.search_limit ?? null,
      branchActiveBufferTarget: branchLead?.active_buffer_target ?? null,
      branchDailyRefillLimit: branchLead?.daily_refill_limit ?? null,
      teams: teams.map((team) => ({
        teamId: team.id,
        teamName: team.name,
        searchLimit: searchTeamById.get(team.id)?.search_limit ?? null,
        activeBufferTarget:
          leadTeamById.get(team.id)?.active_buffer_target ?? null,
        dailyRefillLimit: leadTeamById.get(team.id)?.daily_refill_limit ?? null,
      })),
    });
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to get policy defaults",
      ),
    );
  }
}

export async function getAuditEvents(
  ctx: AppContext,
  input: { limit?: number },
): Promise<Result<CapacityAuditEvent[], DomainError>> {
  try {
    const effectiveLimit = Math.max(
      1,
      input.limit ?? AUDIT_READER_DEFAULT_LIMIT,
    );
    const now = Date.now();
    const [recent, branchUsers, branchTeams] = await Promise.all([
      capacityRepos.auditLogs.listRecent({
        fromInclusive: now - 1000 * 60 * 60 * 24 * 30,
        toInclusive: now,
        limit: effectiveLimit,
      }),
      ctx.actor.role === "admin"
        ? capacityRepos.users.findByBranchIncludingInactive(ctx.actor.branchId)
        : Promise.resolve([]),
      ctx.actor.role === "admin"
        ? capacityRepos.teams.findByBranch(ctx.actor.branchId)
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
        if (event.entity_type === "branch")
          return event.entity_id === ctx.actor.branchId;
        if (event.entity_type === "team")
          return event.entity_id != null && branchTeamIds.has(event.entity_id);
        if (event.entity_type === "user")
          return event.entity_id != null && branchUserIds.has(event.entity_id);
        return false;
      })
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
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Failed to list audit events",
      ),
    );
  }
}
