"use server";

import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { runAction } from "~/server/shared/action-runtime";
import {
  beginTotpEnrollment as beginTotpEnrollmentService,
  finishTotpEnrollment as finishTotpEnrollmentService,
} from "~/server/auth/service-totp";

export async function beginTotpEnrollment(): Promise<{
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  return runAction({
    actionName: "auth.totp.begin",
    requireSession: true,
    execute: beginTotpEnrollmentService,
  });
}

export async function finishTotpEnrollment(code: string): Promise<string[]> {
  const safeCode = assertNonEmptyString(code, "code");
  const result = await runAction({
    actionName: "auth.totp.finish",
    requireSession: true,
    input: { hasCode: true },
    execute: (ctx) =>
      finishTotpEnrollmentService(ctx, {
        code: safeCode,
      }),
  });
  await replaceCurrentSession(result.sessionToken);
  return result.recoveryCodes;
}
