import type { SessionData } from "~/lib/auth/access/session";
import { longName } from "~/lib/users/display-name";
import { AUDIT_READER_DEFAULT_LIMIT } from "~/server/audit-reader/contracts";
import type { createCapacityAuditService } from "~/server/capacity/audit-service";
import type { CapacityReadError } from "~/server/capacity/errors";
import {
  availableLeadRefill,
  todayDateString,
} from "~/server/lead-operations/domain";
import { resolveEffectiveLeadPolicy } from "~/server/lead-operations/policy-service";
import type { LeadCapacitySnapshot } from "~/server/lead-operations/refill-service";
import type { SearchAllowanceSnapshot } from "~/server/search-access/allowance-service";
import {
  availableAllowance,
  currentMonthPeriod,
} from "~/server/search-access/domain";
import { resolveEffectiveSearchPolicy } from "~/server/search-access/policy-service";
import type { UserId } from "~/server/shared/ids";
import type { PolicySource } from "~/server/shared/pipeline-types";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive, canManageExecutiveRecord } from "./scope";

interface CapacityReadServiceDeps {
  repos: Repositories;
  capacityAuditService: ReturnType<typeof createCapacityAuditService>;
}

export type { CapacityReadError } from "~/server/capacity/errors";

export type ManagedExecutiveSummary = {
  id: number;
  fullName: string;
  email: string;
  teamId: number | null;
  searchStatus: SearchAllowanceSnapshot;
  leadStatus: LeadCapacitySnapshot;
};

type ExecutiveCapacityDetail = {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
  };
  searchStatus: SearchAllowanceSnapshot;
  leadStatus: LeadCapacitySnapshot;
  searchPolicy: {
    source: PolicySource;
    monthlySearchLimit: number;
  };
  leadPolicy: {
    source: PolicySource;
    activeBufferTarget: number;
    dailyRefillLimit: number;
  };
  requests: Awaited<ReturnType<Repositories["capacityRequests"]["listByUser"]>>;
};

type CapacityPolicyDefaults = {
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

type CapacityAuditEvent = {
  id: number;
  createdAt: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: AuditChangeValue;
};

type AuditChangePrimitive = string | number | boolean | null;
type AuditChangeValue =
  | AuditChangePrimitive
  | AuditChangeObject
  | AuditChangeValue[];
type AuditChangeObject = { [key: string]: AuditChangeValue };

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

function canViewCapacityAuditEvent(
  session: SessionData,
  event: { entityType: string; entityId: number | null },
) {
  if (session.role === "superuser") {
    return true;
  }

  if (session.role === "admin") {
    return event.entityType !== "branch" || event.entityId === session.branchId;
  }

  return false;
}

export function createCapacityReadService(deps: CapacityReadServiceDeps) {
  const { repos } = deps;

  async function buildManagedExecutivesList(
    session: SessionData,
  ): Promise<ManagedExecutiveSummary[]> {
    const users =
      session.role === "superuser"
        ? await repos.users.findAllActive()
        : await repos.users.findByBranch(session.branchId);
    const supervisedTeam =
      session.role === "supervisor"
        ? await repos.teams.findBySupervisorId(session.userId)
        : null;

    const managedExecutives = users.filter((user) => {
      return canManageExecutiveRecord(
        session,
        user,
        supervisedTeam?.id ?? null,
      );
    });

    const userIds = managedExecutives.map((user) => user.id);
    const teamIds = Array.from(
      new Set(
        managedExecutives
          .map((user) => user.team_id)
          .filter((teamId): teamId is number => teamId != null),
      ),
    );
    const now = Date.now();
    const { periodStart, periodEnd } = currentMonthPeriod();
    const today = todayDateString();

    const [
      searchLedgers,
      leadLedgers,
      activeAssignmentCounts,
      searchBranchDefault,
      searchTeamDefaults,
      searchOverrides,
      leadBranchDefault,
      leadTeamDefaults,
      leadOverrides,
    ] = await Promise.all([
      repos.searchAllowanceLedger.listByUsersAndPeriod(userIds, periodStart),
      repos.leadRefillLedger.listByUsersAndDate(userIds, today),
      repos.leadAssignments.countActiveByUsers(userIds),
      repos.searchPolicyDefaults.findForScope("branch", session.branchId),
      repos.searchPolicyDefaults.listForScope("team", teamIds),
      repos.searchPolicyOverrides.listActiveForUsers(userIds, now),
      repos.leadPolicyDefaults.findForScope("branch", session.branchId),
      repos.leadPolicyDefaults.listForScope("team", teamIds),
      repos.leadPolicyOverrides.listActiveForUsers(userIds, now),
    ]);

    const searchByUserId = new Map(
      searchLedgers.map((ledger) => [ledger.user_id, ledger]),
    );
    const leadByUserId = new Map(
      leadLedgers.map((ledger) => [ledger.user_id, ledger]),
    );
    const activeCountByUserId = new Map(
      activeAssignmentCounts.map((row) => [row.userId, row.activeCount]),
    );
    const searchTeamDefaultById = new Map(
      searchTeamDefaults.map((row) => [row.scope_id, row]),
    );
    const leadTeamDefaultById = new Map(
      leadTeamDefaults.map((row) => [row.scope_id, row]),
    );

    const searchOverrideByUserId = new Map<
      number,
      (typeof searchOverrides)[number]
    >();
    for (const override of searchOverrides) {
      if (!searchOverrideByUserId.has(override.user_id)) {
        searchOverrideByUserId.set(override.user_id, override);
      }
    }

    const leadOverrideByUserId = new Map<
      number,
      (typeof leadOverrides)[number]
    >();
    for (const override of leadOverrides) {
      if (!leadOverrideByUserId.has(override.user_id)) {
        leadOverrideByUserId.set(override.user_id, override);
      }
    }

    return managedExecutives
      .map((user) => {
        const searchLedger = searchByUserId.get(user.id);
        const leadLedger = leadByUserId.get(user.id);
        const activeAssignments = activeCountByUserId.get(user.id) ?? 0;
        const searchOverride = searchOverrideByUserId.get(user.id);
        const leadOverride = leadOverrideByUserId.get(user.id);
        const searchTeamDefault =
          user.team_id != null ? searchTeamDefaultById.get(user.team_id) : null;
        const leadTeamDefault =
          user.team_id != null ? leadTeamDefaultById.get(user.team_id) : null;

        const effectiveSearchPolicy = resolveEffectiveSearchPolicy({
          userOverride: searchOverride,
          teamDefault: searchTeamDefault,
          branchDefault: searchBranchDefault,
        });

        const effectiveLeadPolicy = resolveEffectiveLeadPolicy({
          userOverride: leadOverride,
          teamDefault: leadTeamDefault,
          branchDefault: leadBranchDefault,
        });

        const searchBaseLimit =
          searchLedger?.base_limit ?? effectiveSearchPolicy.monthlySearchLimit;
        const searchExtraGranted = searchLedger?.extra_granted ?? 0;
        const searchUsedAmount = searchLedger?.used_amount ?? 0;

        const leadBaseLimit =
          leadLedger?.base_limit ?? effectiveLeadPolicy.dailyRefillLimit;
        const leadExtraGranted = leadLedger?.extra_granted ?? 0;
        const leadUsedAmount = leadLedger?.used_amount ?? 0;

        return {
          id: user.id,
          fullName: longName({
            names: user.names,
            firstSurname: user.first_surname,
            secondSurname: user.second_surname,
          }),
          email: user.email,
          teamId: user.team_id,
          searchStatus: {
            periodStart,
            periodEnd: searchLedger?.period_end ?? periodEnd,
            policySource: effectiveSearchPolicy.source,
            monthlySearchLimit: searchBaseLimit,
            extraGranted: searchExtraGranted,
            usedAmount: searchUsedAmount,
            remaining: availableAllowance({
              baseLimit: searchBaseLimit,
              extraGranted: searchExtraGranted,
              usedAmount: searchUsedAmount,
            }),
          },
          leadStatus: {
            policySource: effectiveLeadPolicy.source,
            activeBufferTarget: effectiveLeadPolicy.activeBufferTarget,
            activeAssignments,
            dailyRefillLimit: leadBaseLimit,
            extraGranted: leadExtraGranted,
            usedAmount: leadUsedAmount,
            remaining: availableLeadRefill({
              baseLimit: leadBaseLimit,
              extraGranted: leadExtraGranted,
              usedAmount: leadUsedAmount,
            }),
          },
        };
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }

  async function listManagedExecutives(
    session: SessionData,
  ): Promise<Result<ManagedExecutiveSummary[], CapacityReadError>> {
    try {
      return Ok(await buildManagedExecutivesList(session));
    } catch (error) {
      return Err({
        reason: "unexpected",
        message:
          error instanceof Error
            ? error.message
            : "Failed to list managed executives",
      });
    }
  }

  async function getExecutiveCapacityDetail(
    session: SessionData,
    targetUserId: UserId,
  ): Promise<Result<ExecutiveCapacityDetail, CapacityReadError>> {
    try {
      const managed = await canManageExecutive(session, targetUserId, repos);
      if (!managed.ok || !managed.target) {
        return Err({ reason: "forbidden", message: "Forbidden" });
      }

      const now = Date.now();
      const { periodStart, periodEnd } = currentMonthPeriod();
      const today = todayDateString();
      const [
        searchLedger,
        leadLedger,
        activeAssignments,
        searchBranchDefault,
        searchTeamDefault,
        searchOverride,
        leadBranchDefault,
        leadTeamDefault,
        leadOverride,
        requests,
      ] = await Promise.all([
        repos.searchAllowanceLedger.findByUserAndPeriod(
          targetUserId,
          periodStart,
        ),
        repos.leadRefillLedger.findByUserAndDate(targetUserId, today),
        repos.leadAssignments.countActiveByUser(targetUserId),
        repos.searchPolicyDefaults.findForScope(
          "branch",
          managed.target.branch_id,
        ),
        managed.target.team_id == null
          ? Promise.resolve(null)
          : repos.searchPolicyDefaults.findForScope(
              "team",
              managed.target.team_id,
            ),
        repos.searchPolicyOverrides.findActiveForUser(targetUserId, now),
        repos.leadPolicyDefaults.findForScope(
          "branch",
          managed.target.branch_id,
        ),
        managed.target.team_id == null
          ? Promise.resolve(null)
          : repos.leadPolicyDefaults.findForScope(
              "team",
              managed.target.team_id,
            ),
        repos.leadPolicyOverrides.findActiveForUser(targetUserId, now),
        repos.capacityRequests.listByUser(targetUserId),
      ]);

      const effectiveSearchPolicy = resolveEffectiveSearchPolicy({
        userOverride: searchOverride,
        teamDefault: searchTeamDefault,
        branchDefault: searchBranchDefault,
      });
      const effectiveLeadPolicy = resolveEffectiveLeadPolicy({
        userOverride: leadOverride,
        teamDefault: leadTeamDefault,
        branchDefault: leadBranchDefault,
      });

      const searchBaseLimit =
        searchLedger?.base_limit ?? effectiveSearchPolicy.monthlySearchLimit;
      const searchExtraGranted = searchLedger?.extra_granted ?? 0;
      const searchUsedAmount = searchLedger?.used_amount ?? 0;

      const leadBaseLimit =
        leadLedger?.base_limit ?? effectiveLeadPolicy.dailyRefillLimit;
      const leadExtraGranted = leadLedger?.extra_granted ?? 0;
      const leadUsedAmount = leadLedger?.used_amount ?? 0;

      return Ok({
        executive: {
          id: managed.target.id,
          fullName: longName({
            names: managed.target.names,
            firstSurname: managed.target.first_surname,
            secondSurname: managed.target.second_surname,
          }),
          email: managed.target.email,
          teamId: managed.target.team_id,
        },
        searchStatus: {
          periodStart,
          periodEnd: searchLedger?.period_end ?? periodEnd,
          policySource: effectiveSearchPolicy.source,
          monthlySearchLimit: searchBaseLimit,
          extraGranted: searchExtraGranted,
          usedAmount: searchUsedAmount,
          remaining: availableAllowance({
            baseLimit: searchBaseLimit,
            extraGranted: searchExtraGranted,
            usedAmount: searchUsedAmount,
          }),
        },
        leadStatus: {
          policySource: effectiveLeadPolicy.source,
          activeBufferTarget: effectiveLeadPolicy.activeBufferTarget,
          activeAssignments,
          dailyRefillLimit: leadBaseLimit,
          extraGranted: leadExtraGranted,
          usedAmount: leadUsedAmount,
          remaining: availableLeadRefill({
            baseLimit: leadBaseLimit,
            extraGranted: leadExtraGranted,
            usedAmount: leadUsedAmount,
          }),
        },
        searchPolicy: effectiveSearchPolicy,
        leadPolicy: effectiveLeadPolicy,
        requests,
      });
    } catch (error) {
      return Err({
        reason: "unexpected",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get executive capacity detail",
      });
    }
  }

  async function listPendingCapacityRequests(
    session: SessionData,
  ): Promise<
    Result<
      Awaited<ReturnType<typeof repos.capacityRequests.listPendingByBranch>>,
      CapacityReadError
    >
  > {
    try {
      const pending = await repos.capacityRequests.listPendingByBranch(
        session.branchId,
      );
      if (session.role !== "supervisor") {
        return Ok(pending);
      }
      const supervisedTeam = await repos.teams.findBySupervisorId(
        session.userId,
      );
      if (!supervisedTeam) return Ok([]);
      return Ok(
        pending.filter((request) => request.team_id === supervisedTeam.id),
      );
    } catch (error) {
      return Err({
        reason: "unexpected",
        message:
          error instanceof Error
            ? error.message
            : "Failed to list pending capacity requests",
      });
    }
  }

  async function getCapacityPolicyDefaults(
    session: SessionData,
  ): Promise<Result<CapacityPolicyDefaults, CapacityReadError>> {
    try {
      const [teams, branchSearch, branchLead] = await Promise.all([
        repos.teams.findByBranch(session.branchId),
        repos.searchPolicyDefaults.findForScope("branch", session.branchId),
        repos.leadPolicyDefaults.findForScope("branch", session.branchId),
      ]);
      const teamIds = teams.map((team) => team.id);
      const [searchTeamDefaults, leadTeamDefaults] = await Promise.all([
        repos.searchPolicyDefaults.listForScope("team", teamIds),
        repos.leadPolicyDefaults.listForScope("team", teamIds),
      ]);
      const searchTeamDefaultById = new Map(
        searchTeamDefaults.map((row) => [row.scope_id, row]),
      );
      const leadTeamDefaultById = new Map(
        leadTeamDefaults.map((row) => [row.scope_id, row]),
      );

      const teamDefaults = teams.map((team) => {
        const searchDefault = searchTeamDefaultById.get(team.id);
        const leadDefault = leadTeamDefaultById.get(team.id);
        return {
          teamId: team.id,
          teamName: team.name,
          searchLimit: searchDefault?.search_limit ?? null,
          activeBufferTarget: leadDefault?.active_buffer_target ?? null,
          dailyRefillLimit: leadDefault?.daily_refill_limit ?? null,
        };
      });

      return Ok({
        branchId: session.branchId,
        branchSearchLimit: branchSearch?.search_limit ?? null,
        branchActiveBufferTarget: branchLead?.active_buffer_target ?? null,
        branchDailyRefillLimit: branchLead?.daily_refill_limit ?? null,
        teams: teamDefaults,
      });
    } catch (error) {
      return Err({
        reason: "unexpected",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get capacity policy defaults",
      });
    }
  }

  async function listCapacityAuditEvents(
    session: SessionData,
    limit?: number,
  ): Promise<Result<CapacityAuditEvent[], CapacityReadError>> {
    try {
      const effectiveLimit = Math.max(1, limit ?? AUDIT_READER_DEFAULT_LIMIT);
      const recentResult =
        await deps.capacityAuditService.listRecentCapacityEvents(
          effectiveLimit,
        );
      if (isErr(recentResult)) {
        return Err({
          reason: "unexpected",
          message: recentResult.error.message,
        });
      }

      const filtered = recentResult.value
        .filter((event) => canViewCapacityAuditEvent(session, event))
        .map((event) => ({
          id: event.id,
          createdAt: event.createdAt,
          userId: event.userId,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
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

  return {
    listManagedExecutives,
    getExecutiveCapacityDetail,
    listPendingCapacityRequests,
    getCapacityPolicyDefaults,
    listCapacityAuditEvents,
  };
}
