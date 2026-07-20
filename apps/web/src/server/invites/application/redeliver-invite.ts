import { canAssignRole } from "~/lib/auth/access/rbac";
import { auditEntityId } from "~/server/shared/audit-entity";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import { addMilliseconds, epochMilliseconds } from "~/server/shared/time";

import type {
  InviteIssueResult,
  InviteDeps,
  InviteRuntime,
  RedeliverInviteInput,
} from "./types";

// Reuses the existing token. Only revoke-and-reissue rotates it.
export async function redeliverInvite(
  repos: InviteDeps,
  runtime: InviteRuntime,
  input: RedeliverInviteInput,
): Promise<Result<InviteIssueResult, DomainError>> {
  return runtime.uow.run(async (transactionRepos) => {
    const now = runtime.now();

    const invite = await transactionRepos.userInvites.findById(input.inviteId);
    if (!invite) {
      return Err(fail("invite_not_found"));
    }

    if (invite.branch_id !== input.branchId) {
      return Err(fail("cross_branch_forbidden"));
    }

    if (invite.status !== "pending" || invite.expires_at <= now) {
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

    const expiresAt = addMilliseconds(now, runtime.inviteTtlMs);

    await transactionRepos.userInvites.refreshExpiry(invite.id, expiresAt);

    await transactionRepos.events.append({
      type: "user_invite_redelivered",
      entityType: "user",
      entityId: auditEntityId("user", invite.user_id),
      actorUserId: input.actorUserId,
      payload: {
        inviteId: invite.id,
        expiresAt: epochMilliseconds(expiresAt),
      },
      occurredAt: now,
    });

    return Ok({
      inviteId: invite.id,
      token: invite.token,
      expiresAt,
    });
  });
}
