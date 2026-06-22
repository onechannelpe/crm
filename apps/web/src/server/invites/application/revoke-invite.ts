import { canAssignRole } from "~/lib/auth/access/rbac";
import { auditEntityId } from "~/server/shared/audit-entity";
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

    const revokedAt = runtime.now();
    await transactionRepos.userInvites.revokePendingByUser(
      invite.user_id,
      revokedAt,
    );
    await transactionRepos.events.append({
      type: "user_invite_revoked",
      entityType: "user",
      entityId: auditEntityId("user", invite.user_id),
      actorUserId: input.actorUserId,
      payload: { inviteId: invite.id },
      occurredAt: revokedAt,
    });

    return Ok(undefined);
  });
}
