"use server";

import { requireSession } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

export async function updateUserProfile(
  fullName: string,
  phone: string,
): Promise<ActionSuccess> {
  const safeName = assertNonEmptyString(fullName, "fullName");
  const safePhone = assertNonEmptyString(phone, "phone");
  const session = await requireSession();

  await repos.users.updateProfile(session.userId, {
    full_name: safeName,
    phone: safePhone,
  });

  return { success: true };
}
