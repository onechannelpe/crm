"use server";

import { requireSession } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { serverRuntime } from "~/server/runtime";

export async function updateUserProfile(phone: string): Promise<ActionSuccess> {
  const safePhone = assertNonEmptyString(phone, "phone");
  const session = await requireSession();

  await serverRuntime.users.users.updatePhone(session.userId, safePhone);

  return { success: true };
}
