import type { SessionData } from "~/lib/auth/access/session";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityReadError } from "../errors";
import type { CapacityPolicyDefaults } from "./contracts";

export async function getCapacityPolicyDefaults(
  repos: Repositories,
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
