import type { SessionData } from "~/lib/auth/access/session";
import { longName } from "~/lib/users/display-name";
import { AUDIT_READER_DEFAULT_LIMIT } from "~/server/audit-reader/contracts";
import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "~/server/capacity-policy/repos";
import { canManageExecutive } from "~/server/capacity-policy/scope-access";
import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import {
  getLeadCapacityForUser,
  type LeadCapacitySnapshot,
} from "~/server/lead-workflow/read-lead-capacity";
import {
  getSearchCapacityForUser,
  type SearchCapacitySnapshot,
} from "~/server/search-workflow/read-search-capacity";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { TeamId, UserId } from "~/server/shared/ids";
import { asUserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { CapacityRequestsRepo } from "./repos";

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
  requests: Awaited<ReturnType<CapacityRequestsRepo["listByUser"]>>;
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

interface ReadRepos {
  users: {
    findById(id: UserId): Promise<
      | {
          id: number;
          role: string;
          branch_id: number;
          team_id: number | null;
          names: string;
          first_surname: string;
          second_surname: string;
          email: string;
        }
      | undefined
    >;
    findByBranch(branchId: number): Promise<
      Array<{
        id: number;
        role: string;
        branch_id: number;
        team_id: number | null;
        names: string;
        first_surname: string;
        second_surname: string;
        email: string;
      }>
    >;
    findAllActive(): Promise<
      Array<{
        id: number;
        role: string;
        branch_id: number;
        team_id: number | null;
        names: string;
        first_surname: string;
        second_surname: string;
        email: string;
      }>
    >;
    findByBranchIncludingInactive(
      branchId: number,
    ): Promise<Array<{ id: number }>>;
  };
  teams: {
    findBySupervisorId(id: UserId): Promise<{ id: number } | undefined>;
    findByIdWithSupervisor(
      id: TeamId,
    ): Promise<
      | { id: number; branch_id: number; supervisor_id: number | null }
      | undefined
    >;
    findByBranch(
      branchId: number,
    ): Promise<Array<{ id: number; name: string }>>;
  };
  capacityRequests: CapacityRequestsRepo;
  searchPolicyDefaults: SearchPolicyDefaultsRepo;
  searchPolicyOverrides: SearchPolicyOverridesRepo;
  leadPolicyDefaults: LeadPolicyDefaultsRepo;
  leadPolicyOverrides: LeadPolicyOverridesRepo;
  searchCapacityGrants: SearchCapacityGrantsRepo;
  searchUsageReservations: SearchUsageReservationsRepo;
  searchUsageCommits: SearchUsageCommitsRepo;
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
  leadAssignments: { countActiveByUser(id: number): Promise<number> };
  auditLogs: {
    listRecent(params: {
      fromInclusive: number;
      toInclusive: number;
      limit: number;
    }): Promise<
      Array<{
        id: number;
        created_at: number;
        user_id: number;
        action: string;
        entity_type: string;
        entity_id: number | null;
        changes: unknown;
      }>
    >;
  };
}

export async function getManagedExecutives(
  actor: SessionData,
  repos: ReadRepos,
): Promise<Result<ManagedExecutiveSummary[], DomainError>> {
  try {
    const users =
      actor.role === "superuser"
        ? await repos.users.findAllActive()
        : await repos.users.findByBranch(actor.branchId);

    const summaries = await Promise.all(
      users.map(async (user) => {
        const managed = await canManageExecutive(
          actor,
          asUserId(user.id),
          repos,
        );
        if (!managed.ok) return null;

        const [searchStatus, leadStatus] = await Promise.all([
          getSearchCapacityForUser(asUserId(user.id), repos),
          getLeadCapacityForUser(asUserId(user.id), repos),
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
        .filter((s): s is ManagedExecutiveSummary => s !== null)
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

export async function getExecutiveCapacityDetail(
  actor: SessionData,
  targetUserId: UserId,
  repos: ReadRepos,
): Promise<Result<ExecutiveCapacityDetail, DomainError>> {
  try {
    const managed = await canManageExecutive(actor, targetUserId, repos);
    if (!managed.target)
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    if (!managed.ok)
      return Err(domainError("forbidden", "forbidden", "Forbidden"));

    const [searchStatus, leadStatus, requests] = await Promise.all([
      getSearchCapacityForUser(targetUserId, repos),
      getLeadCapacityForUser(targetUserId, repos),
      repos.capacityRequests.listByUser(targetUserId),
    ]);

    if (isErr(searchStatus)) return searchStatus;
    if (isErr(leadStatus)) return leadStatus;

    return Ok({
      executive: {
        id: targetUserId,
        fullName: longName(managed.target),
        email: managed.target.email,
        teamId: managed.target.team_id,
      },
      searchStatus: searchStatus.value,
      leadStatus: leadStatus.value,
      requests,
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

export async function getPendingCapacityRequests(
  actor: SessionData,
  repos: ReadRepos,
): Promise<
  Result<
    Awaited<ReturnType<CapacityRequestsRepo["listPendingByBranch"]>>,
    DomainError
  >
> {
  try {
    const pending = await repos.capacityRequests.listPendingByBranch(
      actor.branchId,
    );
    if (actor.role !== "supervisor") return Ok(pending);
    const supervisedTeam = await repos.teams.findBySupervisorId(actor.userId);
    if (!supervisedTeam) return Ok([]);
    return Ok(pending.filter((r) => r.team_id === supervisedTeam.id));
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

export async function getCapacityPolicyDefaults(
  actor: SessionData,
  repos: ReadRepos,
): Promise<Result<CapacityPolicyDefaults, DomainError>> {
  try {
    const [teams, branchSearch, branchLead] = await Promise.all([
      repos.teams.findByBranch(actor.branchId),
      repos.searchPolicyDefaults.findForScope("branch", actor.branchId),
      repos.leadPolicyDefaults.findForScope("branch", actor.branchId),
    ]);
    const teamIds = teams.map((t) => t.id);
    const [searchTeamDefaults, leadTeamDefaults] = await Promise.all([
      repos.searchPolicyDefaults.listForScope("team", teamIds),
      repos.leadPolicyDefaults.listForScope("team", teamIds),
    ]);
    const searchTeamById = new Map(
      searchTeamDefaults.map((r) => [r.scope_id, r]),
    );
    const leadTeamById = new Map(leadTeamDefaults.map((r) => [r.scope_id, r]));

    return Ok({
      branchId: actor.branchId,
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

function isAuditChangeValue(v: unknown): v is AuditChangeValue {
  if (
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  )
    return true;
  if (Array.isArray(v)) return v.every(isAuditChangeValue);
  if (typeof v === "object") return Object.values(v).every(isAuditChangeValue);
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

export async function getCapacityAuditEvents(
  actor: SessionData,
  repos: ReadRepos,
  limit?: number,
): Promise<Result<CapacityAuditEvent[], DomainError>> {
  try {
    const effectiveLimit = Math.max(1, limit ?? AUDIT_READER_DEFAULT_LIMIT);
    const now = Date.now();
    const [recent, branchUsers, branchTeams] = await Promise.all([
      repos.auditLogs.listRecent({
        fromInclusive: now - 1000 * 60 * 60 * 24 * 30,
        toInclusive: now,
        limit: effectiveLimit,
      }),
      actor.role === "admin"
        ? repos.users.findByBranchIncludingInactive(actor.branchId)
        : Promise.resolve([]),
      actor.role === "admin"
        ? repos.teams.findByBranch(actor.branchId)
        : Promise.resolve([]),
    ]);
    const branchUserIds = new Set(branchUsers.map((u) => u.id));
    const branchTeamIds = new Set(branchTeams.map((t) => t.id));

    const filtered = recent
      .filter(
        (e) =>
          e.action.startsWith("search_") ||
          e.action.startsWith("lead_") ||
          e.action.startsWith("capacity_"),
      )
      .filter((e) => {
        if (actor.role === "superuser") return true;
        if (actor.role !== "admin") return false;
        if (e.entity_type === "branch") return e.entity_id === actor.branchId;
        if (e.entity_type === "team")
          return e.entity_id != null && branchTeamIds.has(e.entity_id);
        if (e.entity_type === "user")
          return e.entity_id != null && branchUserIds.has(e.entity_id);
        return false;
      })
      .map((e) => ({
        id: e.id,
        createdAt: e.created_at,
        userId: e.user_id,
        action: e.action,
        entityType: e.entity_type,
        entityId: e.entity_id,
        changes: parseAuditChanges(e.changes),
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
