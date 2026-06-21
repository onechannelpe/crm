import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

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
): Promise<Result<InviteAcceptedResult, DomainError>> {
  return runtime.uow.run(async (transactionRepos) => {
    const currentTime = runtime.now();
    await transactionRepos.userInvites.expirePendingBefore(currentTime);

    const invite = await transactionRepos.userInvites.findPendingByTokenHash(
      hashInviteToken(input.token),
      currentTime,
    );

    if (!invite) {
      return Err(fail("invite_invalid_or_expired"));
    }
    if (invite.user_is_active === 1) {
      return Err(fail("invite_target_active"));
    }

    const passwordHash = await runtime.hashPassword(input.password);

    await transactionRepos.users.updateInviteProvisioning(invite.user_id, {
      team_id: invite.user_team_id,
      names: invite.user_names,
      first_surname: invite.user_first_surname,
      second_surname: invite.user_second_surname,
      role: invite.user_role,
      is_active: 1,
    });
    await transactionRepos.users.updatePassword(invite.user_id, passwordHash);
    await transactionRepos.userInvites.markAccepted(
      invite.invite_id,
      currentTime,
    );
    await transactionRepos.events.append({
      type: "user_invite_accepted",
      entityType: "user",
      entityId: invite.user_id,
      actorUserId: invite.user_id,
      payload: { inviteId: invite.invite_id },
      occurredAt: currentTime,
    });

    return Ok(mapAcceptedInviteResult(invite));
  });
}
