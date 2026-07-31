import { createInviteService } from "~/server/invites/application/invite-service";
import type {
  InviteDeps,
  InviteService,
} from "~/server/invites/application/types";
import { runResultTransaction } from "~/server/platform/database/uow";

import type { TestDbContext } from "../runtime/db";
import { createTestRepositories } from "../runtime/repos";

type InviteTestRepoFactory = (db: TestDbContext["db"]) => InviteDeps;

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
    create: InviteService["createInvite"];
    accept: InviteService["acceptInvite"];
    redeliver: InviteService["redeliverInvite"];
    revoke: InviteService["revokeInvite"];
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

  const service = createInviteService(baseRepos, {
    uow: {
      run(work) {
        return runResultTransaction(
          (operation) =>
            ctx.db
              .transaction()
              .execute((transactionDb) =>
                operation(createRepos(transactionDb)),
              ),
          work,
        );
      },
    },
    now: options.now ?? (() => new Date()),
    hashPassword: options.hashPassword,
  });

  return {
    service,

    commands: {
      create: (input) => service.createInvite(input),
      accept: (input) => service.acceptInvite(input),
      redeliver: (input) => service.redeliverInvite(input),
      revoke: (input) => service.revokeInvite(input),
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
