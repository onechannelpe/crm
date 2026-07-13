"use server";

import {
  deleteImpersonatorCookie,
  getImpersonatorCookie,
  getSessionCookie,
  setImpersonatorCookie,
  setSessionCookie,
} from "~/lib/auth/session/cookies";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { isErr, Ok } from "~/server/shared/result";

export async function startImpersonation(
  rawUserId: unknown,
): Promise<{ message: string }> {
  return runAction({
    name: "members.impersonation.start",
    access: { kind: "permission", permission: "admin:manage" },
    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),
    audit: (command) => ({ userId: command.userId }),
    execute: async (ctx, command) => {
      // Read the administrator's own cookie before the swap so exiting
      // impersonation can restore it.
      const adminToken = getSessionCookie();
      const result = await getServerRuntime().auth.impersonation.start(
        ctx,
        command,
      );
      if (isErr(result)) return result;

      if (adminToken) setImpersonatorCookie(adminToken);
      setSessionCookie(result.value.token);
      return Ok({ message: "Suplantación iniciada" });
    },
  });
}

export async function stopImpersonation(): Promise<{ message: string }> {
  return runAction({
    name: "members.impersonation.stop",
    access: { kind: "auth" },
    execute: async (ctx) => {
      const result = await getServerRuntime().auth.impersonation.stop(ctx);
      if (isErr(result)) return result;

      const adminToken = getImpersonatorCookie();
      if (adminToken) setSessionCookie(adminToken);
      deleteImpersonatorCookie();
      return Ok({ message: "Suplantación finalizada" });
    },
  });
}
