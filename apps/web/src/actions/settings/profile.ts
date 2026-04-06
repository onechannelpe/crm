"use server";

import { requireSession } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { db } from "~/lib/db/db";
import { createUsersRepo } from "~/server/users/repos-users";

const users = createUsersRepo(db);

export async function updateUserProfile(phone: string): Promise<ActionSuccess> {
  const safePhone = assertNonEmptyString(phone, "phone");
  const session = await requireSession();

  await users.updatePhone(session.userId, safePhone);

  return { success: true };
}
