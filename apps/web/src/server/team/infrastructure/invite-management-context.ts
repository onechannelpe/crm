import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

import type { InviteManagementQueryPort } from "../application/ports";

export function createInviteManagementContext(): InviteManagementQueryPort {
  const provisioning = createUserProvisioningService(repos, {
    runInTransaction: runInRepositoryTransaction,
  });

  return {
    async listTeamsByBranch(branchId) {
      const teams = await repos.teams.findByBranch(branchId);
      return teams.map((team) => ({ id: team.id, name: team.name }));
    },
    listPendingInvites(branchId) {
      return provisioning.listPendingInvites(branchId);
    },
  };
}
