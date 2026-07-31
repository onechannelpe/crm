import "server-only";
import type { InviteActivationView } from "~/contracts/auth";
import { readInviteToken } from "~/domain/auth/invite/activation-input";
import { submitInviteAcceptance } from "~/server/auth/flows/submit-invite-acceptance";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { composeAuth } from "~/server/auth/ui/composition";
import { throwDomain } from "~/server/platform/action/domain-error";
import { getRequestClientMetadata } from "~/server/platform/http/request-context";
import { getInviteInfo as getInviteInfoService } from "~/server/team/application/invites";
import { composeTeam } from "~/server/team/ui/composition";
import { isErr } from "~/shared/result";

export async function getInviteActivationView(
  tokenInput: string,
): Promise<InviteActivationView | null> {
  const safeToken = readInviteToken(tokenInput);
  if (isErr(safeToken)) {
    return null;
  }
  const result = await getInviteInfoService({
    token: safeToken.value,
    repos: composeTeam().invites.repos,
  });
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

  const result = await submitInviteAcceptance(
    composeAuth().inviteAcceptance,
    {
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    input,
  );

  if (isErr(result)) {
    throwDomain(result.error);
  }

  setSessionCookie(result.value.sessionToken);
  return { redirectTo: result.value.redirectTo };
}
