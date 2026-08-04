import type { Kysely, Transaction } from "kysely";

import { createEventsWriter } from "~/server/event-logs/events-repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import { createInviteService } from "../application/invite-service";
import type { InviteTransactionRepos } from "../application/types";

export function bindInviteBaseRepos(db: DatabaseExecutor) {
  return {
    teams: createTeamsRepo(db),
    userInvites: createUserInvitesRepo(db),
    users: createUsersRepo(db),
  };
}

function bindInviteTransactionRepos(
  tx: Transaction<Database>,
): InviteTransactionRepos {
  return {
    ...bindInviteBaseRepos(tx),
    events: createEventsWriter(tx),
  };
}

export function createInviteServiceForExecutor(executor: Kysely<Database>) {
  return createInviteService(bindInviteBaseRepos(executor), {
    uow: createExecutorUow(executor, bindInviteTransactionRepos),
  });
}
