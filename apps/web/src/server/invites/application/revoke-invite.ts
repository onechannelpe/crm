import { canAssignRole } from "~/lib/auth/access/rbac";
import { createAuditService } from "~/server/shared/audit";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { InviteDeps, InviteRuntime, RevokeInviteInput } from "./types";

export async function revokeInvite(
  repos: InviteDeps,
  runtime: InviteRuntime,
  input: RevokeInviteInput,
): Promise<Result<void, DomainError>> {
  return runtime.uow.run(async (transactionRepos) => {
    const invite = await transactionRepos.userInvites.findById(input.inviteId);
    if (!invite) {
      return Err(fail("invite_not_found"));
    }
    if (invite.branch_id !== input.branchId) {
      return Err(fail("cross_branch_forbidden"));
    }
    if (invite.status !== "pending") {
      return Err(fail("invite_not_pending"));
    }

    const user = await transactionRepos.users.findById(invite.user_id);
    if (!user) {
      return Err(fail("invite_target_missing"));
    }
    if (!canAssignRole(input.actorRole, user.role)) {
      return Err(fail("role_not_assignable"));
    }

    await transactionRepos.userInvites.revokePendingByUser(
      invite.user_id,
      runtime.now(),
    );
    await createAuditService(transactionRepos).log(
      input.actorUserId,
      "user_invite_revoked",
      "user",
      invite.user_id,
      {
        inviteId: invite.id,
      },
    );

    return Ok(undefined);
  });
}
