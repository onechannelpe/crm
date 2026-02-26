"use server";

import { forbiddenError, notFoundError } from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
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

  const { verifyPassword } = await import("~/lib/auth/password/password");
  const valid = await verifyPassword(user.password_hash, safeCurrent);
  if (!valid) throw forbiddenError("Current password is incorrect");

  const { hashPassword } = await import("~/lib/auth/password/password");
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
