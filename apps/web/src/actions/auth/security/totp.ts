"use server";

import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import {
  beginTotpEnrollment as beginTotpEnrollmentService,
  finishTotpEnrollment as finishTotpEnrollmentService,
} from "~/server/auth/application/totp";
import { createAuthDeps } from "~/server/auth/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

export async function beginTotpEnrollment(): Promise<{
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  return runAction({
    actionName: "auth.totp.begin",
    requireSession: true,
    execute: (ctx) => beginTotpEnrollmentService(ctx, createAuthDeps()),
  });
}

export async function finishTotpEnrollment(code: string): Promise<string[]> {
  const safeCode = assertNonEmptyString(code, "code");
  const result = await runAction({
    actionName: "auth.totp.finish",
    requireSession: true,
    input: { hasCode: true },
    execute: (ctx) =>
      finishTotpEnrollmentService(ctx, createAuthDeps(), {
        code: safeCode,
      }),
  });
  await replaceCurrentSession(result.sessionToken);
  return result.recoveryCodes;
}
