import "server-only";
import type { InviteActivationView } from "~/contracts/auth";
import { readInviteToken } from "~/domain/auth/invite/activation-input";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { throwDomain } from "~/server/platform/action/domain-error";
import { application } from "~/server/platform/composition/application";
import {
  getRequestClientMetadata,
  getRequestInstant,
} from "~/server/platform/http/request-context";
import { isErr } from "~/shared/result";

export async function getInviteActivationView(
  tokenInput: string,
): Promise<InviteActivationView | null> {
  const safeToken = readInviteToken(tokenInput);
  if (isErr(safeToken)) {
    return null;
  }
  const result = await application.team.invites.getInfo(
    safeToken.value,
    getRequestInstant(),
  );
  if (isErr(result)) {
    throwDomain(result.error);
  }
  return result.value;
}

export async function acceptInvitePasswordStep(input: {
  token: string;
  password: string;
  confirmPassword?: string;
}): Promise<{ redirectTo: string }> {
  const request = getRequestClientMetadata();

  const result = await application.auth.invites.acceptPassword(
    input,
    {
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    getRequestInstant(),
  );

  if (isErr(result)) {
    throwDomain(result.error);
  }

  setSessionCookie(result.value.sessionToken);
  return { redirectTo: result.value.redirectTo };
}
