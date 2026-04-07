import { db } from "~/lib/db/db";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import { createInviteService } from "../application/invite-service";

function createInviteRepos(currentDb: typeof db) {
  return {
    auditLogs: createAuditLogsRepo(currentDb),
    teams: createTeamsRepo(currentDb),
    userInvites: createUserInvitesRepo(currentDb),
    users: createUsersRepo(currentDb),
  };
}

export function createInviteServiceContext() {
  const repos = createInviteRepos(db);

  const inviteService = createInviteService(repos, {
    runInTransaction(operation) {
      return db
        .transaction()
        .execute((transactionDb) =>
          operation(createInviteRepos(transactionDb)),
        );
    },
  });

  return {
    repos,
    inviteService,
  };
}
