"use server";

import { installSession } from "~/actions/auth/install-session";
import { beginTotpEnrollment as beginTotpEnrollmentService } from "~/server/auth/flows/begin-totp-enrollment";
import { finishTotpEnrollment as finishTotpEnrollmentService } from "~/server/auth/flows/finish-totp-enrollment";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { isErr, Ok } from "~/server/shared/result";

export async function beginTotpEnrollment(): Promise<{
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  return runAction({
    name: "auth.totp.begin",
    access: { kind: "session" },

    execute: (ctx) =>
      beginTotpEnrollmentService(ctx, getServerRuntime().auth.totp),
  });
}

export async function finishTotpEnrollment(
  code: string,
): Promise<{ recoveryCodes: string[]; message: string }> {
  const result = await runAction({
    name: "auth.totp.finish",
    access: { kind: "session" },

    // The TOTP code is a secret in flight; parse validates presence but no
    // audit projection records it.
    parse: () =>
      parseObject({ code }, validationFail, (r) => ({
        code: r.str("code"),
      })),

    execute: async (ctx, { code }) => {
      const enrollment = await finishTotpEnrollmentService(
        ctx,
        getServerRuntime().auth.totp,
        { code },
      );

      if (isErr(enrollment)) {
        return enrollment;
      }

      return Ok({
        ...enrollment.value,
        message: "Aplicación de autenticación configurada",
      });
    },
  });

  await installSession(result.sessionToken);

  return {
    recoveryCodes: result.recoveryCodes,
    message: result.message,
  };
}
