"use server";

import { validationError } from "~/lib/app-errors";
import { isValidInviteTokenFormat } from "~/lib/auth/invite/tokens";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { serverRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";
import { acceptTeamInvite as acceptTeamInviteService } from "~/server/team/application/invites";

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
  assertStrongPassword(safeInput.password);
  const request = getRequestClientMetadata();

  const result = await acceptTeamInviteService(
    serverRuntime.team.invites,
    {
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    {
      token: safeInput.token,
      password: safeInput.password,
    },
  );
  if (isErr(result)) {
    throw result.error;
  }
  setSessionCookie(result.value.sessionToken);
}
