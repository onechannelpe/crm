import type { DomainError } from "~/domain/errors";
import type { UserInviteId } from "~/domain/ids";
import { Ok, type Result } from "~/shared/result";

import type { InviteDeps, InviteRuntime } from "./types";

export async function markInviteDelivered(
  repos: InviteDeps,
  runtime: InviteRuntime,
  inviteId: UserInviteId,
  now: Date,
): Promise<Result<void, DomainError>> {
  return runtime.uow.run(async (transactionRepos) => {
    await transactionRepos.userInvites.markDelivered(inviteId, now);
    return Ok(undefined);
  });
}
