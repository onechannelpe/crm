import { canAssignRole } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { inviteError } from "../domain/errors";
import { issueInvite } from "./issue-invite";
import type {
  InviteDeps,
  InviteIssueResult,
  InviteRuntime,
  ResendInviteInput,
} from "./types";

export async function resendInvite(
  repos: InviteDeps,
  runtime: InviteRuntime,
  input: ResendInviteInput,
): Promise<Result<InviteIssueResult, DomainError>> {
  try {
    return await runtime.runInTransaction(async (transactionRepos) => {
      const currentTime = runtime.now();
      await transactionRepos.userInvites.expirePendingBefore(currentTime);

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
            "Only pending invites can be resent",
          ),
        );
      }

      const user = await transactionRepos.users.findById(invite.user_id);
      if (!user || user.branch_id !== input.branchId) {
        return Err(
          inviteError(
            "invite_target_missing",
            "Invite target user was not found",
          ),
        );
      }
      if (user.is_active === 1) {
        return Err(
          inviteError(
            "invite_target_active",
            "Invite target user is already active",
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

      const issued = await issueInvite(transactionRepos, runtime, {
        actorUserId: input.actorUserId,
        branchId: input.branchId,
        userId: user.id,
        email: user.email,
        role: user.role,
        expiresAt: invite.expires_at,
      });

      return Ok(issued);
    });
  } catch (error) {
    throw error;
  }
}
