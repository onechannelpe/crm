import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { InviteDeps, InviteRuntime } from "./types";

export async function markInviteDelivered(
  repos: InviteDeps,
  runtime: InviteRuntime,
  inviteId: number,
): Promise<Result<void, DomainError>> {
  return runtime.uow.run(async (transactionRepos) => {
    await transactionRepos.userInvites.markSent(inviteId, runtime.now());
    return Ok(undefined);
  });
}
