"use server";

import { getRequestEvent } from "solid-js/web";

import { throwDomainError } from "~/actions/throw-domain-error";
import { validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { isValidInviteTokenFormat } from "~/lib/auth/invite/tokens";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { hashPassword } from "~/lib/auth/password/password";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { provisioning } from "./provisioning";
import { assertStrongPassword } from "./validators";

export async function acceptTeamInvite(input: {
  token: string;
  password: string;
}): Promise<void> {
  const safeToken = assertNonEmptyString(input.token, "token");
  if (!isValidInviteTokenFormat(safeToken)) {
    throw validationError("token is invalid");
  }
  const safePassword = assertStrongPassword(input.password);

  const actor = { userId: null as number | null, role: null as Role | null };
  await runObservedAction({
    actionName: "team.invite.accept",
    actor,
    input: { hasToken: true },
    run: async () => {
      const result = await provisioning.acceptInvite({
        token: safeToken,
        passwordHash: await hashPassword(safePassword),
      });
      if (isErr(result)) {
        throwDomainError(result.error);
      }
      actor.userId = result.value.userId;
      actor.role = result.value.role;

      const event = getRequestEvent();
      const ipAddress = getClientIp(event?.request.headers ?? new Headers());
      const userAgent = event?.request.headers.get("user-agent") ?? null;
      const issued = await issueSessionTransition({
        user: {
          id: result.value.userId,
          branch_id: result.value.branchId,
          role: result.value.role,
          onboarding_completed_at: null,
        },
        sessionClass: "pre_auth",
        request: {
          ipAddress,
          userAgent,
        },
        primaryAuthMethod: "password",
        strongAuthMethod: null,
        strongAuthAt: null,
        deps: repos,
      });
      setSessionCookie(issued.token);
    },
  });
}
