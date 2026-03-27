"use server";

import { validationError } from "~/lib/app-errors";
import { isValidInviteTokenFormat } from "~/lib/auth/invite/tokens";
import { hashPassword } from "~/lib/auth/password/password";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { acceptTeamInvite as acceptTeamInviteService } from "~/server/team/service-acceptance";
import { isErr } from "~/server/shared/result";

import { parseAcceptTeamInviteInput } from "./input";
import { assertStrongPassword } from "./validators";

export async function acceptTeamInvite(input: {
  token: string;
  password: string;
}): Promise<void> {
  const safeInput = parseAcceptTeamInviteInput(input);
  if (!isValidInviteTokenFormat(safeInput.token)) {
    throw validationError("token is invalid");
  }
  const safePassword = assertStrongPassword(safeInput.password);
  const request = getRequestClientMetadata();

  const result = await acceptTeamInviteService(
    {
      actor: {
        userId: 0,
        role: "admin",
        branchId: 0,
        onboardingCompleted: false,
        sessionClass: "pre_auth",
        primaryAuthMethod: "password",
        strongAuthMethod: null,
        strongAuthAt: null,
      },
      requestId: crypto.randomUUID(),
      traceId: crypto.randomUUID(),
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      publicOrigin: "",
      now: Date.now,
    },
    {
      token: safeInput.token,
      password: safeInput.password,
      passwordHash: await hashPassword(safePassword),
    },
  );
  if (isErr(result)) {
    throw result.error;
  }
  setSessionCookie(result.value.sessionToken);
}
