import type { Role } from "~/lib/auth/access/rbac";
import { hashPassword } from "~/lib/auth/password/password";

import type {
  InviteAcceptedResult,
  InviteRuntime,
  InviteServiceDeps,
} from "./types";

const DEFAULT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createInviteRuntime(deps: InviteServiceDeps): InviteRuntime {
  return {
    now: deps.now ?? Date.now,
    inviteTtlMs: deps.inviteTtlMs ?? DEFAULT_INVITE_TTL_MS,
    hashPassword: deps.hashPassword ?? hashPassword,
    uow: deps.uow,
  };
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
