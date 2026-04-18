import type { Role } from "~/lib/auth/access/rbac";
import { hashPassword } from "~/lib/auth/password/password";
import { asBranchId, asUserId } from "~/server/shared/ids";

import type {
  InviteAcceptedResult,
  InviteDeps,
  InviteRuntime,
  InviteServiceDeps,
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

export function mapAcceptedInviteResult(invite: {
  user_id: string;
  user_branch_id: string;
  user_role: Role;
}): InviteAcceptedResult {
  return {
    userId: asUserId(invite.user_id),
    branchId: asBranchId(invite.user_branch_id),
    role: invite.user_role,
  };
}
