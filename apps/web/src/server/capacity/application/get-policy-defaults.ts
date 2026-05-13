import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { CapacityPolicyDefaultsView } from "./contracts";

interface PolicyDefaultsDeps {
  repos: {
    teams: {
      findByBranch(branchId: number): Promise<Array<{ id: number; name: string }>>;
    };
    searchPolicyDefaults: {
      findForScope(
        scopeType: "branch" | "team",
        scopeId: number,
      ): Promise<{ search_limit: number } | undefined>;
      listForScope(
        scopeType: "branch" | "team",
        scopeIds: number[],
      ): Promise<Array<{ scope_id: number; search_limit: number }>>;
    };
    leadPolicyDefaults: {
      findForScope(
        scopeType: "branch" | "team",
        scopeId: number,
      ): Promise<
        | {
            active_buffer_target: number;
            daily_refill_limit: number;
          }
        | undefined
      >;
      listForScope(
        scopeType: "branch" | "team",
        scopeIds: number[],
      ): Promise<
        Array<{
          scope_id: number;
          active_buffer_target: number;
          daily_refill_limit: number;
        }>
      >;
    };
  };
}

export async function getPolicyDefaults(
  ctx: AppContext,
  deps: PolicyDefaultsDeps,
): Promise<Result<CapacityPolicyDefaultsView, DomainError>> {
  const [teams, branchSearch, branchLead] = await Promise.all([
    deps.repos.teams.findByBranch(ctx.actor.branchId),
    deps.repos.searchPolicyDefaults.findForScope("branch", ctx.actor.branchId),
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
}
