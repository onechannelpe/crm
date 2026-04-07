import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { createAuditService } from "~/server/shared/audit";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { inviteError } from "../domain/errors";
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
  try {
    return await runtime.runInTransaction(async (transactionRepos) => {
      const currentTime = runtime.now();
      await transactionRepos.userInvites.expirePendingBefore(currentTime);

      const invite = await transactionRepos.userInvites.findPendingByTokenHash(
        hashInviteToken(input.token),
        currentTime,
      );

      if (!invite) {
        return Err(
          inviteError(
            "invite_invalid_or_expired",
            "Invite is invalid or expired",
          ),
        );
      }
      if (invite.user_is_active === 1) {
        return Err(
          inviteError(
            "invite_target_active",
            "Invite target user is already active",
          ),
        );
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
      await createAuditService(transactionRepos).log(
        invite.user_id,
        "user_invite_accepted",
        "user",
        invite.user_id,
        {
          inviteId: invite.invite_id,
        },
      );

      return Ok(mapAcceptedInviteResult(invite));
    });
  } catch {
    return Err(
      inviteError("unexpected", "Unexpected invite acceptance failure"),
    );
  }
}
