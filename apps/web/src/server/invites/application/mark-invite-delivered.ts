import type { DomainError } from "~/server/shared/domain-error";
import type { UserInviteId } from "~/server/shared/ids";
import { Ok, type Result } from "~/server/shared/result";

import type { InviteDeps, InviteRuntime } from "./types";

export async function markInviteDelivered(
  repos: InviteDeps,
  runtime: InviteRuntime,
  inviteId: UserInviteId,
): Promise<Result<void, DomainError>> {
  return runtime.uow.run(async (transactionRepos) => {
    await transactionRepos.userInvites.markDelivered(inviteId, runtime.now());
    return Ok(undefined);
  });
}
