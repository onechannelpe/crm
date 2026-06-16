import { generateInviteToken, hashInviteToken } from "~/lib/auth/invite/tokens";

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
  const expiresAt = input.expiresAt ?? issuedAt + runtime.inviteTtlMs;

  await repos.userInvites.revokePendingByUser(input.userId, issuedAt);

  const token = generateInviteToken();
  const inviteId = await repos.userInvites.create({
    user_id: input.userId,
    branch_id: input.branchId,
    email: input.email,
    role: input.role,
    token_hash: hashInviteToken(token),
    status: "pending",
    expires_at: expiresAt,
    created_by_user_id: input.actorUserId,
    accepted_at: null,
    revoked_at: null,
    created_at: issuedAt,
    sent_at: null,
  });

  await repos.events.append({
    type: "user_invite_issued",
    entityType: "user",
    entityId: input.userId,
    actorUserId: input.actorUserId,
    payload: { inviteId, email: input.email, role: input.role, expiresAt },
    occurredAt: issuedAt,
  });

  return { inviteId, token, expiresAt };
}
