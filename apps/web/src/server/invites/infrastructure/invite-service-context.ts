import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import { createInviteService } from "../application/invite-service";

export type InviteRepos = {
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
  teams: ReturnType<typeof createTeamsRepo>;
  userInvites: ReturnType<typeof createUserInvitesRepo>;
  users: ReturnType<typeof createUsersRepo>;
};

export function createInviteServiceContext(executor: DatabaseExecutor) {
  const repos: InviteRepos = {
    auditLogs: createAuditLogsRepo(executor),
    teams: createTeamsRepo(executor),
    userInvites: createUserInvitesRepo(executor),
    users: createUsersRepo(executor),
  };

  const inviteService = createInviteService(repos, {
    uow: createExecutorUow(
      executor,
      (txDb): InviteRepos => ({
        auditLogs: createAuditLogsRepo(txDb),
        teams: createTeamsRepo(txDb),
        userInvites: createUserInvitesRepo(txDb),
        users: createUsersRepo(txDb),
      }),
    ),
  });

  return {
    repos,
    inviteService,
  };
}
