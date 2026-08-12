import { UserId } from "~/domain/ids";
import {
  deleteImpersonatorCookie,
  getImpersonatorCookie,
  getSessionCookie,
  setImpersonatorCookie,
  setSessionCookie,
} from "~/server/auth/session/cookies";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
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

    telemetry: ({ userId }) => ({ userId }),

    execute: async (ctx, command) => {
      // Capture the original session before replacing it.
      const originalSessionToken = getSessionCookie();

      const result = await getApplication().auth.impersonation.start(
        ctx,
        command,
      );

      if (isErr(result)) {
        return result;
      }

      if (originalSessionToken) {
        setImpersonatorCookie(originalSessionToken);
      }

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
      const result = await getApplication().auth.impersonation.stop(ctx);

      if (isErr(result)) {
        return result;
      }

      const originalSessionToken = getImpersonatorCookie();

      if (originalSessionToken) {
        setSessionCookie(originalSessionToken);
      }

      deleteImpersonatorCookie();

      return Ok({ message: "Suplantación finalizada" });
    },
  });
}
