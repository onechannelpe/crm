import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import { createInviteService } from "../application/invite-service";

function createInviteRepos(executor: DatabaseExecutor) {
  return {
    auditLogs: createAuditLogsRepo(executor),
    teams: createTeamsRepo(executor),
    userInvites: createUserInvitesRepo(executor),
    users: createUsersRepo(executor),
  };
}
export type InviteRepos = ReturnType<typeof createInviteRepos>;

export function createInviteServiceContext(executor: DatabaseExecutor) {
  const repos = createInviteRepos(executor);

  const inviteService = createInviteService(repos, {
    uow: createExecutorUow(executor, createInviteRepos),
  });

  return {
    repos,
    inviteService,
  };
}
