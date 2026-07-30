import { auditEntityId } from "~/domain/audit/entity";
import type { Role } from "~/domain/auth/access/rbac";
import { fail } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { hashPassword, verifyPassword } from "~/server/auth/password/password";
import { canRemoveStrongAuthFactor } from "~/server/auth/security/factor-management-policy";
import { getStrongAuthStatus } from "~/server/auth/security/strong-auth-status";
import { executeSessionServerFunction } from "~/server/platform/action";
import { throwDomain } from "~/server/platform/action/domain-error";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getSecurityRuntime } from "~/server/platform/container/security-runtime";
import { Ok } from "~/shared/result";

async function requireCurrentUserWithStrongAuthState(userId: UserId) {
  const repos = getSecurityRuntime();
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
  "use server";

  return executeSessionServerFunction({
    name: "settings.security.change_password",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ currentPassword, newPassword }, validationFail, (r) => ({
        currentPassword: r.str("currentPassword"),
        newPassword: r.str("newPassword"),
      })),

    execute: async ({ actor }, input) => {
      const userId = actor.userId;
      const { users, events } = getSecurityRuntime();

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
  "use server";

  return executeSessionServerFunction({
    name: "settings.security.remove_passkeys",
    access: { kind: "session" },

    execute: async ({ actor }) => {
      const userId = actor.userId;
      const { passkeys, userRecoveryCodes, events } = getSecurityRuntime();
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
      // Delete recovery codes only after the account loses its last strong factor.
      if (!strongAuthStatus.hasTotp) {
        await userRecoveryCodes.deleteAllByUser(userId);
      }

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
  "use server";

  return executeSessionServerFunction({
    name: "settings.security.disable_totp",
    access: { kind: "session" },

    execute: async ({ actor }) => {
      const userId = actor.userId;
      const { userTotpFactors, userRecoveryCodes, events } =
        getSecurityRuntime();
      const { user, strongAuthStatus } =
        await requireCurrentUserWithStrongAuthState(userId);

      assertProtectedRoleKeepsStrongAuth({
        role: user.role,
        removingTotp: true,
        removingPasskeys: false,
        hasTotp: strongAuthStatus.hasTotp,
        hasPasskey: strongAuthStatus.hasPasskey,
      });

      await userTotpFactors.disable(userId, new Date());
      // Delete recovery codes only after the account loses its last strong factor.
      if (!strongAuthStatus.hasPasskey) {
        await userRecoveryCodes.deleteAllByUser(userId);
      }

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
