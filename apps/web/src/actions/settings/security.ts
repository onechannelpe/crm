"use server";

import { forbiddenError, notFoundError } from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import { hashPassword, verifyPassword } from "~/lib/auth/password/password";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

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
