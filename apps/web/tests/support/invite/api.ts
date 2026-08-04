import { operationAt } from "@tests/support/operation";

import { createInviteService } from "~/server/invites/application/invite-service";
import type {
  InviteService,
  InviteTransactionRepos,
} from "~/server/invites/application/types";
import { runResultTransaction } from "~/server/platform/database/uow";

import type { TestDbContext } from "../runtime/db";
import { createTestRepositories } from "../runtime/repos";

// Used both as the service's base repos and as the uow's transaction repos,
// so it must satisfy the transaction shape (events required).
type InviteTestRepoFactory = (
  db: TestDbContext["db"],
) => InviteTransactionRepos;

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
