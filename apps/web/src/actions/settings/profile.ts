"use server";

import { requireSession } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { serverRuntime } from "~/server/runtime";
import { createUsersRepo } from "~/server/users/repos-users";

export async function updateUserProfile(phone: string): Promise<ActionSuccess> {
  const users = createUsersRepo(serverRuntime.infra.db);
  const safePhone = assertNonEmptyString(phone, "phone");
  const session = await requireSession();

  await users.updatePhone(session.userId, safePhone);

  return { success: true };
}
