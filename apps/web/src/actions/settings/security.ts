"use server";

import type { ActionSuccess } from "~/contracts/common";
import type { Role } from "~/lib/auth/access/rbac";
import { hashPassword, verifyPassword } from "~/lib/auth/password/password";
import { canRemoveStrongAuthFactor } from "~/lib/auth/security/factor-management-policy";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime/runtime";
import {
  conflictFault,
  forbiddenFault,
  notFoundFault,
} from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

async function requireCurrentUserWithStrongAuthState(userId: UserId) {
  const repos = getServerRuntime().security;
  const user = await repos.users.findById(userId);

  if (!user) {
    throw notFoundFault("User not found");
  }

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
  const canRemove = canRemoveStrongAuthFactor({
    role: input.role,
    removingTotp: input.removingTotp,
    removingPasskeys: input.removingPasskeys,
    hasTotp: input.hasTotp,
    hasPasskey: input.hasPasskey,
  });

  if (canRemove) {
    return;
  }

  throw conflictFault(
    "Tu rol requiere mantener al menos un método fuerte configurado",
  );
}

export async function changePassword(
  currentPassword: unknown,
  newPassword: unknown,
): Promise<ActionSuccess> {
  return runAction({
    name: "settings.security.change_password",
    access: { kind: "session" },

    parse: () =>
      parseObject({ currentPassword, newPassword }, validationFail, (r) => ({
        currentPassword: r.str("currentPassword"),
        newPassword: r.str("newPassword"),
      })),

    execute: async ({ actor }, input) => {
      const userId = actor.userId;
      const { users, auditLogs } = getServerRuntime().security;

      const user = await users.findById(userId);

      if (!user) {
        throw notFoundFault("User not found");
      }

      const valid = await verifyPassword(
        user.password_hash,
        input.currentPassword,
      );

      if (!valid) {
        throw forbiddenFault("Current password is incorrect");
      }

      const newHash = await hashPassword(input.newPassword);

      await users.updatePassword(userId, newHash);

      await auditLogs.create({
        user_id: userId,
        action: "password_changed",
        entity_type: "user",
        entity_id: userId,
        changes: null,
        created_at: Date.now(),
      });

      return Ok({ success: true });
    },
  });
}

export async function removeAllPasskeys(): Promise<ActionSuccess> {
  return runAction({
    name: "settings.security.remove_passkeys",
    access: { kind: "session" },

    execute: async ({ actor }) => {
      const userId = actor.userId;
      const { passkeys, auditLogs } = getServerRuntime().security;
      const { user, strongAuthStatus } =
        await requireCurrentUserWithStrongAuthState(userId);

      assertProtectedRoleKeepsStrongAuth({
        role: user.role,
        removingTotp: false,
        removingPasskeys: true,
        hasTotp: strongAuthStatus.hasTotp,
        hasPasskey: strongAuthStatus.hasPasskey,
      });

      await passkeys.deleteAllByUser(userId);

      await auditLogs.create({
        user_id: userId,
        action: "passkeys_removed",
        entity_type: "user",
        entity_id: userId,
        changes: null,
        created_at: Date.now(),
      });

      return Ok({ success: true });
    },
  });
}

export async function disableTotp(): Promise<ActionSuccess> {
  return runAction({
    name: "settings.security.disable_totp",
    access: { kind: "session" },

    execute: async ({ actor }) => {
      const userId = actor.userId;
      const { userTotpFactors, userTotpRecoveryCodes, auditLogs } =
        getServerRuntime().security;
      const { user, strongAuthStatus } =
        await requireCurrentUserWithStrongAuthState(userId);

      assertProtectedRoleKeepsStrongAuth({
        role: user.role,
        removingTotp: true,
        removingPasskeys: false,
        hasTotp: strongAuthStatus.hasTotp,
        hasPasskey: strongAuthStatus.hasPasskey,
      });

      await userTotpFactors.disable(userId);
      await userTotpRecoveryCodes.deleteAllByUser(userId);

      await auditLogs.create({
        user_id: userId,
        action: "totp_disabled",
        entity_type: "user",
        entity_id: userId,
        changes: null,
        created_at: Date.now(),
      });

      return Ok({ success: true });
    },
  });
}
