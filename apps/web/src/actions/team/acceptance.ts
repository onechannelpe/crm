"use server";

import { validationError } from "~/lib/app-errors";
import { isValidInviteTokenFormat } from "~/lib/auth/invite/tokens";
import { hashPassword } from "~/lib/auth/password/password";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { isErr } from "~/server/shared/result";
import { acceptTeamInvite as acceptTeamInviteService } from "~/server/team/service";

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
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
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
