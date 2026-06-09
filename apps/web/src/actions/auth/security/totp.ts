"use server";

import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import { beginTotpEnrollment as beginTotpEnrollmentService } from "~/server/auth/application/commands/begin-totp-enrollment";
import { finishTotpEnrollment as finishTotpEnrollmentService } from "~/server/auth/application/commands/finish-totp-enrollment";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";

export async function beginTotpEnrollment(): Promise<{
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  const totpContext = getServerRuntime().auth.totp;

  return runAction({
    name: "auth.totp.begin",
    access: { kind: "session" },
    execute: (ctx) => beginTotpEnrollmentService(ctx, totpContext),
  });
}

export async function finishTotpEnrollment(code: string): Promise<string[]> {
  const runtime = getServerRuntime();
  const result = await runAction({
    name: "auth.totp.finish",
    access: { kind: "session" },

    // The TOTP code is a secret in flight; parse validates presence but no
    // audit projection records it.
    parse: () =>
      parseObject({ code }, validationFail, (r) => ({
        code: r.str("code"),
      })),

    execute: (ctx, { code }) =>
      finishTotpEnrollmentService(ctx, runtime.auth.totp, { code }),
  });

  await replaceCurrentSession(
    result.sessionToken,
    runtime.auth.sessionService.invalidateSession,
  );

  return result.recoveryCodes;
}
