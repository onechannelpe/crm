import { generateInviteToken } from "~/lib/auth/invite/tokens";
import { auditEntityId } from "~/server/shared/audit-entity";
import { addMilliseconds, epochMilliseconds } from "~/server/shared/time";

import type {
  InviteDeps,
  InviteIssueResult,
  InviteRuntime,
  IssueInviteInput,
} from "./types";

export async function issueInvite(
  repos: InviteDeps,
  runtime: InviteRuntime,
  input: IssueInviteInput,
): Promise<InviteIssueResult> {
  const issuedAt = runtime.now();
  const expiresAt =
    input.expiresAt ?? addMilliseconds(issuedAt, runtime.inviteTtlMs);

  await repos.userInvites.revokePendingByUser(input.userId, issuedAt);

  const token = generateInviteToken();
  const inviteId = await repos.userInvites.create({
    user_id: input.userId,
    branch_id: input.branchId,
    email: input.email,
    role: input.role,
    token,
    status: "pending",
    expires_at: expiresAt,
    created_by_user_id: input.actorUserId,
    accepted_at: null,
    revoked_at: null,
    created_at: issuedAt,
    last_delivered_at: null,
  });

  await repos.events.append({
    type: "user_invite_issued",
    entityType: "user",
    entityId: auditEntityId("user", input.userId),
    actorUserId: input.actorUserId,
    payload: {
      inviteId,
      email: input.email,
      role: input.role,
      expiresAt: epochMilliseconds(expiresAt),
    },
    occurredAt: issuedAt,
  });

  return { inviteId, token, expiresAt };
}
