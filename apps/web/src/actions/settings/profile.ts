"use server";

import { requireSession } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

export async function updateUserProfile(phone: string): Promise<ActionSuccess> {
  const safePhone = assertNonEmptyString(phone, "phone");
  const session = await requireSession();

  await repos.users.updatePhone(session.userId, safePhone);

  return { success: true };
}
