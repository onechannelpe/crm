import { createEventsRepo } from "~/server/event-logs/events-repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createExecutorUow } from "~/server/platform/database/uow";
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

export function createInviteServiceForExecutor(
  executor: DatabaseExecutor,
  now: () => Date,
) {
  const repos = bindInviteRepos(executor);

  return createInviteService(repos, {
    uow: createExecutorUow(executor, bindInviteRepos),
    now,
  });
}
