"use server";

import type { Role } from "~/lib/auth/access/rbac";
import { hashPassword, verifyPassword } from "~/lib/auth/password/password";
import { canRemoveStrongAuthFactor } from "~/lib/auth/security/factor-management-policy";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { auditEntityId } from "~/server/shared/audit-entity";
import { fail, throwDomain } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

async function requireCurrentUserWithStrongAuthState(userId: UserId) {
  const repos = getServerRuntime().security;
  const user = await repos.users.findById(userId);

  if (!user) {
    throwDomain(fail("user_not_found"));
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

  throwDomain(fail("strong_method_required"));
}

export async function changePassword(
  currentPassword: unknown,
  newPassword: unknown,
): Promise<{ message: string }> {
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
      const { users, events } = getServerRuntime().security;

      const user = await users.findById(userId);

      if (!user) {
        throwDomain(fail("user_not_found"));
      }

      const valid = await verifyPassword(
        user.password_hash,
        input.currentPassword,
      );

      if (!valid) {
        throwDomain(fail("current_password_incorrect"));
      }

      const newHash = await hashPassword(input.newPassword);

      await users.updatePassword(userId, newHash);

      await events.append({
        type: "password_changed",
        entityType: "user",
        entityId: auditEntityId("user", userId),
        actorUserId: userId,
        occurredAt: new Date(),
      });

      return Ok({ message: "Contraseña actualizada" });
    },
  });
}

export async function removeAllPasskeys(): Promise<{ message: string }> {
  return runAction({
    name: "settings.security.remove_passkeys",
    access: { kind: "session" },

    execute: async ({ actor }) => {
      const userId = actor.userId;
      const { passkeys, events } = getServerRuntime().security;
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

      await events.append({
        type: "passkeys_removed",
        entityType: "user",
        entityId: auditEntityId("user", userId),
        actorUserId: userId,
        occurredAt: new Date(),
      });

      return Ok({ message: "Claves de acceso eliminadas" });
    },
  });
}

export async function disableTotp(): Promise<{ message: string }> {
  return runAction({
    name: "settings.security.disable_totp",
    access: { kind: "session" },

    execute: async ({ actor }) => {
      const userId = actor.userId;
      const { userTotpFactors, userTotpRecoveryCodes, events } =
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

      await events.append({
        type: "totp_disabled",
        entityType: "user",
        entityId: auditEntityId("user", userId),
        actorUserId: userId,
        occurredAt: new Date(),
      });

      return Ok({ message: "Aplicación de autenticación desactivada" });
    },
  });
}
