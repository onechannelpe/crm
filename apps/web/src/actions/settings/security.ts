"use server";

import { conflictError, forbiddenError, notFoundError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requireSession } from "~/lib/auth/access/session";
import { hashPassword, verifyPassword } from "~/lib/auth/password/password";
import { canRemoveStrongAuthFactor } from "~/lib/auth/security/factor-management-policy";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { db } from "~/lib/db/db";
import {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import type { UserId } from "~/server/shared/ids";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createPasskeysRepo } from "~/server/users/repos-passkeys";
import { createUsersRepo } from "~/server/users/repos-users";

const repos = {
  users: createUsersRepo(db),
  passkeys: createPasskeysRepo(db),
  userTotpFactors: createUserTotpFactorsRepo(db),
  userTotpRecoveryCodes: createUserTotpRecoveryCodesRepo(db),
  auditLogs: createAuditLogsRepo(db),
};

async function requireCurrentUserWithStrongAuthState(userId: UserId) {
  const user = await repos.users.findById(userId);
  if (!user) throw notFoundError("User not found");

  const strongAuthStatus = await getStrongAuthStatus(userId, repos);
  return { user, strongAuthStatus };
}

function assertProtectedRoleKeepsStrongAuth(input: {
  role: Role;
  removingTotp: boolean;
  removingPasskeys: boolean;
  hasTotp: boolean;
  hasPasskey: boolean;
}) {
  if (
    canRemoveStrongAuthFactor({
      role: input.role,
      removingTotp: input.removingTotp,
      removingPasskeys: input.removingPasskeys,
      hasTotp: input.hasTotp,
      hasPasskey: input.hasPasskey,
    })
  ) {
    return;
  }

  throw conflictError(
    "Tu rol requiere mantener al menos un método fuerte configurado",
  );
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionSuccess> {
  const safeCurrent = assertNonEmptyString(currentPassword, "currentPassword");
  const safeNew = assertNonEmptyString(newPassword, "newPassword");
  const session = await requireSession();

  const user = await repos.users.findById(session.userId);
  if (!user) throw notFoundError("User not found");

  const valid = await verifyPassword(user.password_hash, safeCurrent);
  if (!valid) throw forbiddenError("Current password is incorrect");

  const newHash = await hashPassword(safeNew);
  await repos.users.updatePassword(session.userId, newHash);

  await repos.auditLogs.create({
    user_id: session.userId,
    action: "password_changed",
    entity_type: "user",
    entity_id: session.userId,
    changes: null,
    created_at: Date.now(),
  });

  return { success: true };
}

export async function removeAllPasskeys(): Promise<ActionSuccess> {
  const session = await requireSession();
  const { user, strongAuthStatus } =
    await requireCurrentUserWithStrongAuthState(session.userId);
  assertProtectedRoleKeepsStrongAuth({
    role: user.role,
    removingTotp: false,
    removingPasskeys: true,
    hasTotp: strongAuthStatus.hasTotp,
    hasPasskey: strongAuthStatus.hasPasskey,
  });

  await repos.passkeys.deleteAllByUser(session.userId);
  await repos.auditLogs.create({
    user_id: session.userId,
    action: "passkeys_removed",
    entity_type: "user",
    entity_id: session.userId,
    changes: null,
    created_at: Date.now(),
  });

  return { success: true };
}

export async function disableTotp(): Promise<ActionSuccess> {
  const session = await requireSession();
  const { user, strongAuthStatus } =
    await requireCurrentUserWithStrongAuthState(session.userId);
  assertProtectedRoleKeepsStrongAuth({
    role: user.role,
    removingTotp: true,
    removingPasskeys: false,
    hasTotp: strongAuthStatus.hasTotp,
    hasPasskey: strongAuthStatus.hasPasskey,
  });

  await repos.userTotpFactors.disable(session.userId);
  await repos.userTotpRecoveryCodes.deleteAllByUser(session.userId);
  await repos.auditLogs.create({
    user_id: session.userId,
    action: "totp_disabled",
    entity_type: "user",
    entity_id: session.userId,
    changes: null,
    created_at: Date.now(),
  });

  return { success: true };
}
