import { createInviteService } from "~/server/invites/application/invite-service";
import type { InviteService } from "~/server/invites/application/types";
import { runResultTransaction } from "~/server/shared/application/uow";

import type { TestDbContext } from "../runtime/db";
import { createTestRepositories } from "../runtime/repos";

export function createInviteTestKit(
  ctx: TestDbContext,
  options: {
    now?: () => number;
    hashPassword?: (password: string) => Promise<string>;
  } = {},
): {
  service: InviteService;
  commands: {
    create: InviteService["createInvite"];
    accept: InviteService["acceptInvite"];
    resend: InviteService["resendInvite"];
    revoke: InviteService["revokeInvite"];
  };
  expect: {
    inviteStatus(inviteId: number): Promise<string | undefined>;
    userActive(userId: number): Promise<number | undefined>;
  };
} {
  const service = createInviteService(ctx.repos, {
    uow: {
      run(work) {
        return runResultTransaction(
          (operation) =>
            ctx.db
              .transaction()
              .execute((transactionDb) =>
                operation(createTestRepositories(transactionDb)),
              ),
          work,
        );
      },
    },
    now: options.now,
    hashPassword: options.hashPassword,
  });

  return {
    service,
    commands: {
      create: (input) => service.createInvite(input),
      accept: (input) => service.acceptInvite(input),
      resend: (input) => service.resendInvite(input),
      revoke: (input) => service.revokeInvite(input),
    },
    expect: {
      async inviteStatus(inviteId: number) {
        const invite = await ctx.repos.userInvites.findById(inviteId);
        return invite?.status;
      },
      async userActive(userId: number) {
        const user = await ctx.repos.users.findById(userId);
        return user?.is_active;
      },
    },
  };
}
