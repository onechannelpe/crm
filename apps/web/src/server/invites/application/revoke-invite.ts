import { canAssignRole } from "~/lib/auth/access/rbac";
import { createAuditService } from "~/server/shared/audit";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { inviteError } from "../domain/errors";
import type { InviteDeps, InviteRuntime, RevokeInviteInput } from "./types";

export async function revokeInvite(
  repos: InviteDeps,
  runtime: InviteRuntime,
  input: RevokeInviteInput,
): Promise<Result<void, DomainError>> {
  return runtime.runInTransaction(async (transactionRepos) => {
    const invite = await transactionRepos.userInvites.findById(
      input.inviteId,
    );
    if (!invite) {
      return Err(inviteError("invite_not_found", "Invite not found"));
    }
    if (invite.branch_id !== input.branchId) {
      return Err(
        inviteError(
          "cross_branch_forbidden",
          "Cannot manage invites from another branch",
        ),
      );
    }
    if (invite.status !== "pending") {
      return Err(
        inviteError(
          "invite_not_pending",
          "Only pending invites can be revoked",
        ),
      );
    }

    const user = await transactionRepos.users.findById(invite.user_id);
    if (!user) {
      return Err(
        inviteError(
          "invite_target_missing",
          "Invite target user was not found",
        ),
      );
    }
    if (!canAssignRole(input.actorRole, user.role)) {
      return Err(
        inviteError(
          "role_not_assignable",
          "You cannot manage invites for this role",
        ),
      );
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
