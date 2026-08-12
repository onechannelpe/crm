import { operationAt } from "@tests/support/operation";

import { createEventsWriter } from "~/server/event-logs/events-repo";
import { createInviteService } from "~/server/invites/application/invite-service";
import type {
  InviteService,
  InviteBaseRepos,
} from "~/server/invites/application/types";
import { createExecutorUow } from "~/server/platform/database/uow";

import type { TestDbContext } from "../runtime/db";
import { createTestRepositories } from "../runtime/repos";

type InviteTestRepoFactory = (db: TestDbContext["db"]) => InviteBaseRepos;

export function createInviteTestKit(
  ctx: TestDbContext,
  options: {
    now?: () => Date;
    hashPassword?: (password: string) => Promise<string>;
    createRepos?: InviteTestRepoFactory;
  } = {},
): {
  service: InviteService;
  commands: {
    create: (
      input: Parameters<InviteService["createInvite"]>[0],
    ) => ReturnType<InviteService["createInvite"]>;
    accept: (
      input: Parameters<InviteService["acceptInvite"]>[0],
    ) => ReturnType<InviteService["acceptInvite"]>;
    redeliver: (
      input: Parameters<InviteService["redeliverInvite"]>[0],
    ) => ReturnType<InviteService["redeliverInvite"]>;
    revoke: (
      input: Parameters<InviteService["revokeInvite"]>[0],
    ) => ReturnType<InviteService["revokeInvite"]>;
  };
  expect: {
    inviteStatus(
      inviteId: Parameters<
        TestDbContext["repos"]["userInvites"]["findById"]
      >[0],
    ): Promise<string | undefined>;
    userActive(
      userId: Parameters<TestDbContext["repos"]["users"]["findById"]>[0],
    ): Promise<boolean | undefined>;
  };
} {
  const createRepos = options.createRepos ?? createTestRepositories;
  const baseRepos = createRepos(ctx.db);
  const resolveNow = options.now ?? (() => new Date());

  const service = createInviteService(baseRepos, {
    uow: createExecutorUow(ctx.db, (tx) => ({
      ...createRepos(tx),
      events: createEventsWriter(tx),
    })),
    hashPassword: options.hashPassword,
  });

  return {
    service,

    commands: {
      create: (input) => service.createInvite(input, operationAt(resolveNow())),
      accept: (input) => service.acceptInvite(input, operationAt(resolveNow())),
      redeliver: (input) =>
        service.redeliverInvite(input, operationAt(resolveNow())),
      revoke: (input) => service.revokeInvite(input, operationAt(resolveNow())),
    },

    expect: {
      async inviteStatus(
        inviteId: Parameters<
          TestDbContext["repos"]["userInvites"]["findById"]
        >[0],
      ) {
        const invite = await ctx.repos.userInvites.findById(inviteId);

        return invite?.status;
      },

      async userActive(
        userId: Parameters<TestDbContext["repos"]["users"]["findById"]>[0],
      ) {
        const user = await ctx.repos.users.findById(userId);

        return user?.is_active;
      },
    },
  };
}
