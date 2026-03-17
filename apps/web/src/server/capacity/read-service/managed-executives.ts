import type { SessionData } from "~/lib/auth/access/session";
import { longName } from "~/lib/users/display-name";
import { todayDateString } from "~/server/lead-operations/domain";
import { resolveEffectiveLeadPolicy } from "~/server/lead-operations/policy-service";
import { currentMonthPeriod } from "~/server/search-access/domain";
import { resolveEffectiveSearchPolicy } from "~/server/search-access/policy-service";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import { canManageExecutiveRecord } from "../scope";
import type { ManagedExecutiveSummary } from "./contracts";
import { buildLeadStatus, buildSearchStatus } from "./snapshot-builders";

export async function listManagedExecutives(
  repos: Repositories,
  session: SessionData,
): Promise<Result<ManagedExecutiveSummary[], DomainError>> {
  try {
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
    const branchIds = Array.from(
      new Set(managedExecutives.map((user) => user.branch_id)),
    );
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
      searchBranchDefaults,
      searchTeamDefaults,
      searchOverrides,
      leadBranchDefaults,
      leadTeamDefaults,
      leadOverrides,
    ] = await Promise.all([
      repos.searchAllowanceLedger.listByUsersAndPeriod(userIds, periodStart),
      repos.leadRefillLedger.listByUsersAndDate(userIds, today),
      repos.leadAssignments.countActiveByUsers(userIds),
      repos.searchPolicyDefaults.listForScope("branch", branchIds),
      repos.searchPolicyDefaults.listForScope("team", teamIds),
      repos.searchPolicyOverrides.listActiveForUsers(userIds, now),
      repos.leadPolicyDefaults.listForScope("branch", branchIds),
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
    const searchBranchDefaultById = new Map(
      searchBranchDefaults.map((row) => [row.scope_id, row]),
    );
    const searchTeamDefaultById = new Map(
      searchTeamDefaults.map((row) => [row.scope_id, row]),
    );
    const leadBranchDefaultById = new Map(
      leadBranchDefaults.map((row) => [row.scope_id, row]),
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

    return Ok(
      managedExecutives
        .map((user) => {
          const searchLedger = searchByUserId.get(user.id);
          const leadLedger = leadByUserId.get(user.id);
          const activeAssignments = activeCountByUserId.get(user.id) ?? 0;
          const searchOverride = searchOverrideByUserId.get(user.id);
          const leadOverride = leadOverrideByUserId.get(user.id);
          const searchBranchDefault = searchBranchDefaultById.get(
            user.branch_id,
          );
          const searchTeamDefault =
            user.team_id != null
              ? searchTeamDefaultById.get(user.team_id)
              : null;
          const leadBranchDefault = leadBranchDefaultById.get(user.branch_id);
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

          return {
            id: user.id,
            fullName: longName({
              names: user.names,
              firstSurname: user.first_surname,
              secondSurname: user.second_surname,
            }),
            email: user.email,
            teamId: user.team_id,
            searchStatus: buildSearchStatus({
              periodStart,
              periodEnd,
              ledger: searchLedger,
              policy: effectiveSearchPolicy,
            }),
            leadStatus: buildLeadStatus({
              activeAssignments,
              ledger: leadLedger,
              policy: effectiveLeadPolicy,
            }),
          };
        })
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
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
