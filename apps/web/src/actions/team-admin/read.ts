"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";
import { teamAdminService } from "~/server/shared/context";

export async function getManagedExecutives() {
  const session = await requirePermission("team:read");
  return teamAdminService.listManagedExecutives(session);
}

export async function getExecutiveCapacityDetail(userId: number) {
  const session = await requirePermission("team:manage");
  return teamAdminService.getExecutiveDetail(session, userId);
}

export async function getAllowanceRequests() {
  const session = await requirePermission("team:manage");
  return teamAdminService.listPendingRequests(session);
}

export async function getSalesPolicyDefaults() {
  const session = await requirePermission("admin:manage");
  const [teams, branchSearch, branchLead] = await Promise.all([
    repos.teams.findByBranch(session.branchId),
    repos.searchPolicyDefaults.findForScope("branch", session.branchId),
    repos.leadPolicyDefaults.findForScope("branch", session.branchId),
  ]);

  const teamDefaults = [];
  for (const team of teams) {
    const [searchDefault, leadDefault] = await Promise.all([
      repos.searchPolicyDefaults.findForScope("team", team.id),
      repos.leadPolicyDefaults.findForScope("team", team.id),
    ]);
    teamDefaults.push({
      teamId: team.id,
      teamName: team.name,
      searchLimit: searchDefault?.search_limit ?? null,
      activeBufferTarget: leadDefault?.active_buffer_target ?? null,
      dailyRefillLimit: leadDefault?.daily_refill_limit ?? null,
    });
  }

  return {
    branchId: session.branchId,
    branchSearchLimit: branchSearch?.search_limit ?? null,
    branchActiveBufferTarget: branchLead?.active_buffer_target ?? null,
    branchDailyRefillLimit: branchLead?.daily_refill_limit ?? null,
    teams: teamDefaults,
  };
}
