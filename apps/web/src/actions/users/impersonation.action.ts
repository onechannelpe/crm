import { UserId } from "~/domain/ids";
import {
  deleteImpersonatorCookie,
  getImpersonatorCookie,
  getSessionCookie,
  setImpersonatorCookie,
  setSessionCookie,
} from "~/server/auth/session/cookies";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";
import { isErr, Ok } from "~/shared/result";

export async function startImpersonation(
  rawUserId: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
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
      const result = await getAuthRuntime().impersonation.start(ctx, command);
      if (isErr(result)) return result;

      if (adminToken) setImpersonatorCookie(adminToken);
      setSessionCookie(result.value.token);
      return Ok({ message: "Suplantación iniciada" });
    },
  });
}

export async function stopImpersonation(): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "members.impersonation.stop",
    access: { kind: "auth" },
    execute: async (ctx) => {
      const result = await getAuthRuntime().impersonation.stop(ctx);
      if (isErr(result)) return result;

      const adminToken = getImpersonatorCookie();
      if (adminToken) setSessionCookie(adminToken);
      deleteImpersonatorCookie();
      return Ok({ message: "Suplantación finalizada" });
    },
  });
}
