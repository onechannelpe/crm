import { fail } from "~/domain/errors";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import { Err, isErr, Ok } from "~/shared/result";

export async function beginTotpEnrollment(): Promise<{
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  "use server";

  return executeSessionServerFunction({
    name: "auth.totp.begin",
    access: { kind: "session" },

    execute: (ctx) => application.auth.security.startTotpEnrollment(ctx),
  });
}

export async function finishTotpEnrollment(
  rawCode: unknown,
): Promise<{ recoveryCodes: string[]; message: string }> {
  "use server";

  const result = await executeSessionServerFunction({
    name: "auth.totp.finish",
    access: { kind: "session" },

    parse: () => {
      if (typeof rawCode !== "string" || !/^\d{6}$/.test(rawCode)) {
        return Err(fail("totp_code_invalid"));
      }

      return Ok({ code: rawCode });
    },

    execute: (ctx, command) =>
      application.auth.security.finishTotpEnrollment(ctx, command.code),
  });

  setSessionCookie(result.sessionToken);

  return {
    recoveryCodes: result.recoveryCodes,
    message: "Aplicación de autenticación configurada",
  };
}
