import "server-only";
import type { InviteActivationView } from "~/contracts/auth";
import { isValidInviteTokenFormat } from "~/domain/auth/invite/tokens";
import { fail, type DomainError } from "~/domain/errors";
import { submitInviteAcceptance } from "~/server/auth/flows/submit-invite-acceptance";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { composeAuth } from "~/server/auth/ui/composition";
import { throwDomain } from "~/server/platform/action/domain-error";
import { getRequestClientMetadata } from "~/server/platform/http/request-context";
import { getInviteInfo as getInviteInfoService } from "~/server/team/application/invites";
import { composeTeam } from "~/server/team/ui/composition";
import { Err, isErr, Ok, type Result } from "~/shared/result";

function readInviteToken(raw: string): Result<string, DomainError> {
  const token = raw.trim();
  if (!token || !isValidInviteTokenFormat(token)) {
    return Err(fail("invite_token_malformed"));
  }
  return Ok(token);
}

function readStrongPassword(raw: string): Result<string, DomainError> {
  if (!raw.trim() || raw.length < 12) {
    return Err(fail("invite_password_too_short"));
  }
  if (!/[A-Z]/.test(raw)) {
    return Err(fail("invite_password_missing_uppercase"));
  }
  if (!/[a-z]/.test(raw)) {
    return Err(fail("invite_password_missing_lowercase"));
  }
  if (!/[0-9]/.test(raw)) {
    return Err(fail("invite_password_missing_number"));
  }
  return Ok(raw);
}

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
  if (
    input.confirmPassword !== undefined &&
    input.password !== input.confirmPassword
  ) {
    throwDomain(fail("password_mismatch"));
  }

  const token = readInviteToken(input.token);
  if (isErr(token)) throwDomain(token.error);

  const password = readStrongPassword(input.password);
  if (isErr(password)) throwDomain(password.error);

  const request = getRequestClientMetadata();

  const result = await submitInviteAcceptance(
    composeAuth().inviteAcceptance,
    {
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    { token: token.value, password: password.value },
  );

  if (isErr(result)) {
    throwDomain(result.error);
  }

  setSessionCookie(result.value.sessionToken);
  return { redirectTo: result.value.redirectTo };
}
