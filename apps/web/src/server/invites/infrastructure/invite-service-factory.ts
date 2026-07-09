import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createEventsRepo } from "~/server/shared/repos-events";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUserInvitesRepo } from "~/server/users/repos-user-invites";
import { createUsersRepo } from "~/server/users/repos-users";

import { createInviteService } from "../application/invite-service";

export type InviteRepos = {
  events: ReturnType<typeof createEventsRepo>;
  teams: ReturnType<typeof createTeamsRepo>;
  userInvites: ReturnType<typeof createUserInvitesRepo>;
  users: ReturnType<typeof createUsersRepo>;
};

export function bindInviteRepos(db: DatabaseExecutor): InviteRepos {
  return {
    events: createEventsRepo(db),
    teams: createTeamsRepo(db),
    userInvites: createUserInvitesRepo(db),
    users: createUsersRepo(db),
  };
}

export function createInviteServiceForExecutor(executor: DatabaseExecutor) {
  const repos = bindInviteRepos(executor);

  return createInviteService(repos, {
    uow: createExecutorUow(executor, bindInviteRepos),
  });
}
