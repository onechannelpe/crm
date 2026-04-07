import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { inviteError } from "../domain/errors";
import type { InviteDeps, InviteRuntime } from "./types";

export async function markInviteDelivered(
  repos: InviteDeps,
  runtime: InviteRuntime,
  inviteId: number,
): Promise<Result<void, DomainError>> {
  try {
    await runtime.runInTransaction(async (transactionRepos) => {
      await transactionRepos.userInvites.markSent(inviteId, runtime.now());
    });
    return Ok(undefined);
  } catch {
    return Err(
      inviteError("unexpected", "Unexpected invite delivery mark failure"),
    );
  }
}
