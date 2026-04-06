import { db } from "~/lib/db/db";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

import type { InviteManagementQueryPort } from "../application/ports";

export function createInviteManagementContext(): InviteManagementQueryPort {
  const repos = {
    auditLogs: createAuditLogsRepo(db),
    teams: createTeamsRepo(db),
    userInvites: createUserInvitesRepo(db),
    users: createUsersRepo(db),
  };
  const provisioning = createUserProvisioningService(repos, {
    runInTransaction(operation) {
      return db.transaction().execute((transactionDb) =>
        operation({
          auditLogs: createAuditLogsRepo(transactionDb),
          teams: createTeamsRepo(transactionDb),
          userInvites: createUserInvitesRepo(transactionDb),
          users: createUsersRepo(transactionDb),
        }),
      );
    },
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
