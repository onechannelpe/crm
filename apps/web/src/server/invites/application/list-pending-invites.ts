import type { DomainError } from "~/domain/errors";
import type { BranchId } from "~/domain/ids";
import type { OperationContext } from "~/server/platform/operation/context";
import { Ok, type Result } from "~/shared/result";

import type { InviteBaseRepos, PendingBranchInvite } from "./types";

export async function listPendingInvites(
  repos: InviteBaseRepos,
  branchId: BranchId,
  operation: OperationContext,
): Promise<Result<PendingBranchInvite[], DomainError>> {
  const rows = await repos.userInvites.findLatestPendingByBranch(
    branchId,
    operation.operationAt,
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
      token: row.invite_token,
      expiresAt: row.invite_expires_at,
      createdAt: row.invite_created_at,
      createdByUserId: row.invite_created_by_user_id,
      lastDeliveredAt: row.invite_last_delivered_at,
    })),
  );
}
