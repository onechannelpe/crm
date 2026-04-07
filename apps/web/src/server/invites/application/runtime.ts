import type { Role } from "~/lib/auth/access/rbac";
import { generateInviteToken, hashInviteToken } from "~/lib/auth/invite/tokens";
import { hashPassword } from "~/lib/auth/password/password";
import { createAuditService } from "~/server/shared/audit";

import type {
  InviteAcceptedResult,
  InviteDeps,
  InviteRuntime,
  InviteServiceDeps,
  IssueInviteInput,
  InviteIssueResult,
} from "./types";

const DEFAULT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createInviteRuntime(
  repos: InviteDeps,
  deps: InviteServiceDeps,
): InviteRuntime {
  return {
    now: deps.now ?? Date.now,
    inviteTtlMs: deps.inviteTtlMs ?? DEFAULT_INVITE_TTL_MS,
    hashPassword: deps.hashPassword ?? hashPassword,
    runInTransaction:
      deps.runInTransaction ??
      (async <T>(operation: (transactionRepos: InviteDeps) => Promise<T>) =>
        operation(repos)),
  };
}

export async function issueInvite(
  repos: InviteDeps,
  runtime: InviteRuntime,
  input: IssueInviteInput,
): Promise<InviteIssueResult> {
  const inviteAudit = createAuditService(repos);
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

  await inviteAudit.log(
    input.actorUserId,
    "user_invite_issued",
    "user",
    input.userId,
    {
      inviteId,
      email: input.email,
      role: input.role,
      expiresAt,
    },
  );

  return { inviteId, token, expiresAt };
}

export function mapAcceptedInviteResult(invite: {
  user_id: number;
  user_branch_id: number;
  user_role: Role;
}): InviteAcceptedResult {
  return {
    userId: invite.user_id,
    branchId: invite.user_branch_id,
    role: invite.user_role,
  };
}
