"use server";

import { conflictError, validationError } from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { getServerRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

export async function updateUserProfile(phone: string): Promise<ActionSuccess> {
  const safePhone = assertNonEmptyString(phone, "phone");
  const localPhone = parsePhone(safePhone);
  if (!localPhone) {
    throw validationError("El número debe tener 9 dígitos y empezar con 9");
  }
  const session = await requireSession();

  const result = await getServerRuntime().users.updatePhone(
    session.userId,
    localPhone,
  );
  if (isErr(result)) {
    throw conflictError("Este número de WhatsApp ya está en uso");
  }

  return { success: true };
}
