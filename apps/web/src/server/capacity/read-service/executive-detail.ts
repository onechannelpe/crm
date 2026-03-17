import type { SessionData } from "~/lib/auth/access/session";
import { longName } from "~/lib/users/display-name";
import { todayDateString } from "~/server/lead-operations/domain";
import { resolveEffectiveLeadPolicy } from "~/server/lead-operations/policy-service";
import { currentMonthPeriod } from "~/server/search-access/domain";
import { resolveEffectiveSearchPolicy } from "~/server/search-access/policy-service";
import type { UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityReadError } from "../errors";
import { canManageExecutive } from "../scope";
import type { ExecutiveCapacityDetail } from "./contracts";
import { buildLeadStatus, buildSearchStatus } from "./snapshot-builders";

export async function getExecutiveCapacityDetail(
  repos: Repositories,
  session: SessionData,
  targetUserId: UserId,
): Promise<Result<ExecutiveCapacityDetail, CapacityReadError>> {
  try {
    const managed = await canManageExecutive(session, targetUserId, repos);
    if (!managed.target) {
      return Err({ reason: "not_found", message: "Executive not found" });
    }
    if (!managed.ok) {
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
      repos.leadPolicyDefaults.findForScope("branch", managed.target.branch_id),
      managed.target.team_id == null
        ? Promise.resolve(null)
        : repos.leadPolicyDefaults.findForScope("team", managed.target.team_id),
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
