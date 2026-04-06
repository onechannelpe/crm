import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityReadContext } from "../infrastructure/read-context";
import type { CapacityPolicyDefaultsView } from "./queries/views/capacity-policy-defaults-view";

export async function getPolicyDefaults(
  ctx: AppContext,
  deps: CapacityReadContext,
): Promise<Result<CapacityPolicyDefaultsView, DomainError>> {
  try {
    const [teams, branchSearch, branchLead] = await Promise.all([
      deps.repos.teams.findByBranch(ctx.actor.branchId),
      deps.repos.searchPolicyDefaults.findForScope(
        "branch",
        ctx.actor.branchId,
      ),
      deps.repos.leadPolicyDefaults.findForScope("branch", ctx.actor.branchId),
    ]);
    const teamIds = teams.map((team) => team.id);
    const [searchTeamDefaults, leadTeamDefaults] = await Promise.all([
      deps.repos.searchPolicyDefaults.listForScope("team", teamIds),
      deps.repos.leadPolicyDefaults.listForScope("team", teamIds),
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

export type { CapacityPolicyDefaultsView };
