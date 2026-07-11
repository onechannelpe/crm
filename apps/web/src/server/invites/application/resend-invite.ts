import { canAssignRole } from "~/lib/auth/access/rbac";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

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
  return runtime.uow.run(async (transactionRepos) => {
    const currentTime = runtime.now();
    await transactionRepos.userInvites.expirePendingBefore(currentTime);

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
    if (!user || user.branch_id !== input.branchId) {
      return Err(fail("invite_target_missing"));
    }
    if (user.is_active) {
      return Err(fail("invite_target_active"));
    }
    if (!canAssignRole(input.actorRole, user.role)) {
      return Err(fail("role_not_assignable"));
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
}
