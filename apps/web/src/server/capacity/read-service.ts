import type { SessionData } from "~/lib/auth/access/session";
import { longName } from "~/lib/users/display-name";
import { createLeadPolicyService } from "~/server/lead-operations/policy-service";
import { createLeadReadService } from "~/server/lead-operations/read-service";
import { createSearchPolicyService } from "~/server/search-access/policy-service";
import { createSearchReadService } from "~/server/search-access/read-service";
import type { Repositories } from "~/server/shared/registry";

import { canManageExecutive } from "./scope";

export function createCapacityReadService(repos: Repositories) {
  const searchRead = createSearchReadService(repos);
  const leadRead = createLeadReadService(repos);
  const searchPolicy = createSearchPolicyService(repos);
  const leadPolicy = createLeadPolicyService(repos);

  async function listManagedExecutives(session: SessionData) {
    const users = await repos.users.findByBranch(session.branchId);
    const executives = [];

    for (const user of users) {
      if (user.role !== "executive") continue;
      const managed = await canManageExecutive(session, user.id, repos);
      if (!managed.ok) continue;

      const [searchStatus, leadStatus] = await Promise.all([
        searchRead.getExecutiveSearchSnapshot(session, user.id),
        leadRead.getExecutiveLeadSnapshot(session, user.id),
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

    return executives.sort((left, right) =>
      left.fullName.localeCompare(right.fullName),
    );
  }

  return {
    listManagedExecutives,

    async getExecutiveCapacityDetail(
      session: SessionData,
      targetUserId: number,
    ) {
      const managed = await canManageExecutive(session, targetUserId, repos);
      if (!managed.ok || !managed.target) {
        throw new Error("Forbidden");
      }

      const [
        searchStatus,
        leadStatus,
        searchPolicyStatus,
        leadPolicyStatus,
        requests,
      ] = await Promise.all([
        searchRead.getExecutiveSearchSnapshot(session, targetUserId),
        leadRead.getExecutiveLeadSnapshot(session, targetUserId),
        searchPolicy.getEffectiveSearchPolicy(targetUserId),
        leadPolicy.getEffectiveLeadPolicy(targetUserId),
        repos.capacityRequests.listByUser(targetUserId),
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

    async listPendingCapacityRequests(session: SessionData) {
      const pending = await repos.capacityRequests.listPendingByBranch(
        session.branchId,
      );
      if (session.role !== "supervisor") {
        return pending;
      }
      const supervisedTeam = await repos.teams.findBySupervisorId(
        session.userId,
      );
      if (!supervisedTeam) return [];
      return pending.filter((request) => request.team_id === supervisedTeam.id);
    },
  };
}
