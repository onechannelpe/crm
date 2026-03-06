"use server";

import {
  conflictError,
  internalError,
  validationError,
} from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";
import { createAccountOnboardingService } from "~/server/users/service-account-onboarding";

function assertE164Phone(value: string): string {
  const normalized = value.replace(/\s+/g, "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw validationError("phone must be a valid E.164 number");
  }
  return normalized;
}

export async function completeOnboarding(phoneE164: string): Promise<void> {
  const session = await requireSession();
  const safePhone = assertE164Phone(phoneE164);
  const service = createAccountOnboardingService(repos, {
    runInTransaction: runInRepositoryTransaction,
  });
  const result = await service.completeOnboarding({
    userId: session.userId,
    phoneE164: safePhone,
  });
  if (!isErr(result)) {
    return;
  }
  switch (result.error.reason) {
    case "user_not_found":
    case "unexpected":
      throw internalError(result.error.message);
    case "strong_auth_required":
      throw conflictError(result.error.message);
  }

  const exhaustive: never = result.error;
  void exhaustive;
  throw internalError("Unexpected onboarding completion failure");
}
