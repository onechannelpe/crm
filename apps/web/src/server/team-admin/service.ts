import type { SessionData } from "~/lib/auth/access/session";
import { longName } from "~/lib/users/display-name";
import type { Repositories } from "~/server/shared/registry";

import { createLeadOpsService } from "../lead-ops/service";
import { createLeadPolicyService } from "../lead-ops/policy-service";
import { createSearchAccessService } from "../search-access/service";
import { createSearchPolicyService } from "../search-access/policy-service";
import { canManageExecutive } from "./scope";

export function createTeamAdminService(repos: Repositories) {
  const searchAccess = createSearchAccessService(repos);
  const leadOps = createLeadOpsService(repos);
  const searchPolicy = createSearchPolicyService(repos);
  const leadPolicy = createLeadPolicyService(repos);

  async function listManagedExecutives(session: SessionData) {
    const users = await repos.users.findByBranch(session.branchId);
    const filtered =
      session.role === "supervisor"
        ? users.filter((user) => user.team_id !== null)
        : users;

    const executives = [];
    for (const user of filtered) {
      if (user.role !== "executive") continue;
      const managed = await canManageExecutive(session, user.id, repos);
      if (!managed.ok) continue;
      const [searchStatus, leadStatus] = await Promise.all([
        searchAccess.getStatus(user.id),
        leadOps.getStatus(user.id),
      ]);
      executives.push({
        id: user.id,
        fullName: longName({
          names: user.names,
          firstSurname: user.first_surname,
          secondSurname: user.second_surname,
        }),
        email: user.email,
        teamId: user.team_id,
        searchStatus,
        leadStatus,
      });
    }

    return executives.sort((left, right) => left.fullName.localeCompare(right.fullName));
  }

  return {
    listManagedExecutives,

    async getExecutiveDetail(session: SessionData, targetUserId: number) {
      const managed = await canManageExecutive(session, targetUserId, repos);
      if (!managed.ok || !managed.target) {
        throw new Error("Forbidden");
      }
      const [searchStatus, leadStatus, searchPolicyStatus, leadPolicyStatus, requests] =
        await Promise.all([
          searchAccess.getStatus(targetUserId),
          leadOps.getStatus(targetUserId),
          searchPolicy.getEffectivePolicy(targetUserId),
          leadPolicy.getEffectivePolicy(targetUserId),
          repos.allowanceRequests.listByUser(targetUserId),
        ]);
      return {
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
        searchStatus,
        leadStatus,
        searchPolicy: searchPolicyStatus,
        leadPolicy: leadPolicyStatus,
        requests,
      };
    },

    async listPendingRequests(session: SessionData) {
      const pending = await repos.allowanceRequests.listPendingByBranch(session.branchId);
      if (session.role !== "supervisor") {
        return pending;
      }
      const supervisedTeam = await repos.teams.findBySupervisorId(session.userId);
      if (!supervisedTeam) {
        return [];
      }
      return pending.filter((request) => request.team_id === supervisedTeam.id);
    },
  };
}
