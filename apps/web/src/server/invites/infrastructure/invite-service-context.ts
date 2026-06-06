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

export function bindInviteRepos(db: DatabaseExecutor): InviteRepos {
  return {
    auditLogs: createAuditLogsRepo(db),
    teams: createTeamsRepo(db),
    userInvites: createUserInvitesRepo(db),
    users: createUsersRepo(db),
  };
}

export function createInviteServiceContext(executor: DatabaseExecutor) {
  const repos = bindInviteRepos(executor);

  const inviteService = createInviteService(repos, {
    uow: createExecutorUow(executor, bindInviteRepos),
  });

  return {
    repos,
    inviteService,
  };
}
