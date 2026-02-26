"use server";

import { getRequestEvent } from "solid-js/web";

import { appErrorFromMessage, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { isValidInviteTokenFormat } from "~/lib/auth/invite/tokens";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { hashPassword } from "~/lib/auth/password/password";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { createSession } from "~/lib/auth/session/session-manager";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { isErr } from "~/server/shared/result";

import { provisioning } from "./provisioning";
import { assertStrongPassword } from "./validators";

export async function acceptTeamInvite(input: {
  token: string;
  fullName: string;
  password: string;
}): Promise<void> {
  const safeToken = assertNonEmptyString(input.token, "token");
  if (!isValidInviteTokenFormat(safeToken)) {
    throw validationError("token is invalid");
  }
  const safeFullName = assertNonEmptyString(input.fullName, "fullName");
  const safePassword = assertStrongPassword(input.password);

  const actor = { userId: null as number | null, role: null as Role | null };
  await runObservedAction({
    actionName: "team.invite.accept",
    actor,
    input: { hasToken: true },
    run: async () => {
      const result = await provisioning.acceptInvite({
        token: safeToken,
        fullName: safeFullName,
        passwordHash: await hashPassword(safePassword),
      });
      if (isErr(result)) {
        throw appErrorFromMessage(result.error);
      }
      actor.userId = result.value.userId;
      actor.role = result.value.role;

      const event = getRequestEvent();
      const ipAddress = getClientIp(event?.request.headers ?? new Headers());
      const userAgent = event?.request.headers.get("user-agent") ?? null;
      const token = await createSession(
        result.value.userId,
        result.value.branchId,
        result.value.role,
        ipAddress,
        userAgent,
        "password",
        null,
      );
      setSessionCookie(token);
    },
  });
}
