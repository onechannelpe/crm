import type { DomainError } from "~/server/shared/domain-error";
import type { BranchId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import { inviteError } from "../domain/errors";
import type { InviteDeps, InviteRuntime, PendingBranchInvite } from "./types";

export async function listPendingInvites(
  repos: InviteDeps,
  runtime: InviteRuntime,
  branchId: BranchId,
): Promise<Result<PendingBranchInvite[], DomainError>> {
  try {
    const currentTime = runtime.now();
    await repos.userInvites.expirePendingBefore(currentTime);
    const rows = await repos.userInvites.findLatestPendingByBranch(
      branchId,
      currentTime,
    );

    return Ok(
      rows.map((row) => ({
        inviteId: row.invite_id,
        userId: row.user_id,
        email: row.user_email,
        names: row.user_names,
        firstSurname: row.user_first_surname,
        secondSurname: row.user_second_surname,
        role: row.user_role,
        teamId: row.user_team_id,
        expiresAt: row.invite_expires_at,
        createdAt: row.invite_created_at,
        createdByUserId: row.invite_created_by_user_id,
        sentAt: row.invite_sent_at,
      })),
    );
  } catch {
    return Err(
      inviteError("unexpected", "Unexpected pending invites read failure"),
    );
  }
}
