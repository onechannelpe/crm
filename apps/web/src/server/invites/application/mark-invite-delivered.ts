import type { DomainError } from "~/domain/errors";
import type { UserInviteId } from "~/domain/ids";
import type { OperationContext } from "~/server/platform/operation/context";
import { Ok, type Result } from "~/shared/result";

import type { InviteDeps, InviteRuntime } from "./types";

export async function markInviteDelivered(
  repos: InviteDeps,
  runtime: InviteRuntime,
  inviteId: UserInviteId,
  operation: OperationContext,
): Promise<Result<void, DomainError>> {
  return runtime.uow.run(async (transactionRepos) => {
    await transactionRepos.userInvites.markDelivered(
      inviteId,
      operation.operationAt,
    );
    return Ok(undefined);
  });
}
