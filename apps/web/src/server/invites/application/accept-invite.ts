import { auditEntityId } from "~/domain/audit/entity";
import { fail, type DomainError } from "~/domain/errors";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, Ok, type Result } from "~/shared/result";

import { mapAcceptedInviteResult } from "./runtime";
import type {
  AcceptInviteInput,
  InviteAcceptedResult,
  InviteDeps,
  InviteRuntime,
} from "./types";

export async function acceptInvite(
  repos: InviteDeps,
  runtime: InviteRuntime,
  input: AcceptInviteInput,
  operation: OperationContext,
): Promise<Result<InviteAcceptedResult, DomainError>> {
  return runtime.uow.run(async (transactionRepos) => {
    const currentTime = operation.operationAt;

    const invite = await transactionRepos.userInvites.findPendingByToken(
      input.token,
      currentTime,
    );

    if (!invite) {
      return Err(fail("invite_invalid_or_expired"));
    }
    if (invite.user_is_active) {
      return Err(fail("invite_target_active"));
    }

    const passwordHash = await runtime.hashPassword(input.password);

    await transactionRepos.users.updateInviteProvisioning(invite.user_id, {
      team_id: invite.user_team_id,
      names: invite.user_names,
      first_surname: invite.user_first_surname,
      second_surname: invite.user_second_surname,
      role: invite.user_role,
      is_active: true,
    });
    await transactionRepos.users.updatePassword(invite.user_id, passwordHash);
    await transactionRepos.userInvites.markAccepted(
      invite.invite_id,
      currentTime,
    );
    await transactionRepos.events.append({
      type: "user_invite_accepted",
      entityType: "user",
      entityId: auditEntityId("user", invite.user_id),
      actorUserId: invite.user_id,
      payload: { inviteId: invite.invite_id },
      occurredAt: currentTime,
    });

    return Ok(mapAcceptedInviteResult(invite));
  });
}
