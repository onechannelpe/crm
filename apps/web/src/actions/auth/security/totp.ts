"use server";

import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import {
  beginTotpEnrollment as beginTotpEnrollmentService,
  finishTotpEnrollment as finishTotpEnrollmentService,
} from "~/server/auth/application/totp";
import { createTotpEnrollmentContext } from "~/server/auth/infrastructure/totp-context";
import { runAction } from "~/server/shared/action-runtime";

export async function beginTotpEnrollment(): Promise<{
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  const totpContext = createTotpEnrollmentContext();
  return runAction({
    actionName: "auth.totp.begin",
    access: { kind: "session" },
    execute: (ctx) => beginTotpEnrollmentService(ctx, totpContext),
  });
}

export async function finishTotpEnrollment(code: string): Promise<string[]> {
  const safeCode = assertNonEmptyString(code, "code");
  const totpContext = createTotpEnrollmentContext();
  const result = await runAction({
    actionName: "auth.totp.finish",
    access: { kind: "session" },
    input: { hasCode: true },
    execute: (ctx) =>
      finishTotpEnrollmentService(ctx, totpContext, {
        code: safeCode,
      }),
  });
  await replaceCurrentSession(result.sessionToken);
  return result.recoveryCodes;
}
