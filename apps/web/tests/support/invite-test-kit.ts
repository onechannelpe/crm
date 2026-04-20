import { createInviteService } from "../../src/server/invites/application/invite-service";
import type { InviteService } from "../../src/server/invites/application/types";
import {
  asInviteId,
  type BranchId,
  type InviteId,
  type UserId,
} from "../../src/server/shared/ids";
import type { TestDbContext } from "./test-db";

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
    inviteStatus(inviteId: InviteId): Promise<string | undefined>;
    userActive(userId: UserId): Promise<number | undefined>;
  };
} {
  const service = createInviteService(ctx.repos, {
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
      async inviteStatus(inviteId: InviteId) {
        const invite = await ctx.repos.userInvites.findById(inviteId);
        return invite?.status;
      },
      async userActive(userId: UserId) {
        const user = await ctx.repos.users.findById(userId);
        return user?.is_active;
      },
    },
  };
}
