import type { Role } from "~/domain/auth/access/rbac";
import type { BranchId, UserId } from "~/domain/ids";
import { hashPassword } from "~/server/auth/password/password";

import type {
  InviteAcceptedResult,
  InviteRuntime,
  InviteServiceDeps,
} from "./types";

const DEFAULT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createInviteRuntime(deps: InviteServiceDeps): InviteRuntime {
  return {
    inviteTtlMs: deps.inviteTtlMs ?? DEFAULT_INVITE_TTL_MS,
    hashPassword: deps.hashPassword ?? hashPassword,
    uow: deps.uow,
  };
}

export function mapAcceptedInviteResult(invite: {
  user_id: UserId;
  user_branch_id: BranchId;
  user_role: Role;
}): InviteAcceptedResult {
  return {
    userId: invite.user_id,
    branchId: invite.user_branch_id,
    role: invite.user_role,
  };
}
