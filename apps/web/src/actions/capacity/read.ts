"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { repos, capacityReadService } from "~/server/shared/context";

export async function getManagedExecutives() {
  const session = await requirePermission("capacity:read:team");
  return capacityReadService.listManagedExecutives(session);
}

export async function getExecutiveCapacityDetail(userId: number) {
  const session = await requirePermission("capacity:manage");
  return capacityReadService.getExecutiveCapacityDetail(session, userId);
}

export async function getPendingCapacityRequests() {
  const session = await requirePermission("capacity:approve");
  return capacityReadService.listPendingCapacityRequests(session);
}

export async function getCapacityPolicyDefaults() {
  const session = await requirePermission("capacity:policy:manage");
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
