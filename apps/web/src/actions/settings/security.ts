"use server";

import { conflictError, forbiddenError, notFoundError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requireSession } from "~/lib/auth/access/session";
import { hashPassword, verifyPassword } from "~/lib/auth/password/password";
import { canRemoveStrongAuthFactor } from "~/lib/auth/security/factor-management-policy";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { getServerRuntime } from "~/server/runtime";
import type { UserId } from "~/server/shared/ids";

async function requireCurrentUserWithStrongAuthState(userId: UserId) {
  const repos = getServerRuntime().security;
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
  const { users, auditLogs } = getServerRuntime().security;
  const safeCurrent = assertNonEmptyString(currentPassword, "currentPassword");
  const safeNew = assertNonEmptyString(newPassword, "newPassword");
  const session = await requireSession();

  const user = await users.findById(session.userId);
  if (!user) throw notFoundError("User not found");

  const valid = await verifyPassword(user.password_hash, safeCurrent);
  if (!valid) throw forbiddenError("Current password is incorrect");

  const newHash = await hashPassword(safeNew);
  await users.updatePassword(session.userId, newHash);

  await auditLogs.create({
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
  const { passkeys, auditLogs } = getServerRuntime().security;
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

  await passkeys.deleteAllByUser(session.userId);
  await auditLogs.create({
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
  const { userTotpFactors, userTotpRecoveryCodes, auditLogs } =
    getServerRuntime().security;
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

  await userTotpFactors.disable(session.userId);
  await userTotpRecoveryCodes.deleteAllByUser(session.userId);
  await auditLogs.create({
    user_id: session.userId,
    action: "totp_disabled",
    entity_type: "user",
    entity_id: session.userId,
    changes: null,
    created_at: Date.now(),
  });

  return { success: true };
}
