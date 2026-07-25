"use server";

import { fail } from "~/domain/errors";
import { verifyTotpEnrollment } from "~/server/auth/factors/totp-enrollment";
import { completeFactorEnrollment } from "~/server/auth/flows/complete-factor-enrollment";
import { startTotpEnrollment } from "~/server/auth/flows/start-totp-enrollment";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { Err, isErr, Ok } from "~/shared/result";

export async function beginTotpEnrollment(): Promise<{
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  return runAction({
    name: "auth.totp.begin",
    access: { kind: "session" },

    execute: (ctx) => startTotpEnrollment(ctx, getServerRuntime().auth.setup),
  });
}

export async function finishTotpEnrollment(
  rawCode: unknown,
): Promise<{ recoveryCodes: string[]; message: string }> {
  const result = await runAction({
    name: "auth.totp.finish",
    access: { kind: "session" },

    parse: () => {
      if (typeof rawCode !== "string" || !/^\d{6}$/.test(rawCode)) {
        return Err(fail("totp_code_invalid"));
      }

      return Ok({ code: rawCode });
    },

    execute: async ({ actor, ...ctx }, command) => {
      const setup = getServerRuntime().auth.setup;

      const verified = await verifyTotpEnrollment(setup.repos, {
        userId: actor.userId,
        code: command.code,
      });

      if (isErr(verified)) {
        return verified;
      }

      return completeFactorEnrollment({ actor, ...ctx }, setup, {
        method: "totp",
        enrollment: verified.value,
      });
    },
  });

  setSessionCookie(result.sessionToken);

  return {
    recoveryCodes: result.recoveryCodes,
    message: "Aplicación de autenticación configurada",
  };
}
