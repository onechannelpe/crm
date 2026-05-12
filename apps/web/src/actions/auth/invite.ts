"use server";

import { validationError } from "~/lib/app-errors";
import { isValidInviteTokenFormat } from "~/lib/auth/invite/tokens";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { getRequestClientMetadata } from "~/lib/http/request-context";
import { submitInviteAcceptance } from "~/server/auth/application/commands/submit-invite-acceptance";
import { getServerRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";
import { getInviteInfo as getInviteInfoService } from "~/server/team/application/invites";

export interface InviteActivationView {
  fullName: string;
  username: string;
  email: string;
}

export type AcceptInviteResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

function assertInviteToken(raw: string): string {
  const token = assertNonEmptyString(raw, "token").trim();
  if (!isValidInviteTokenFormat(token)) {
    throw validationError("token is invalid");
  }
  return token;
}

function assertStrongPassword(raw: string): string {
  const password = assertNonEmptyString(raw, "password");
  if (password.length < 12) {
    throw validationError("password must contain at least 12 characters");
  }
  if (!/[A-Z]/.test(password)) {
    throw validationError("password must include an uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    throw validationError("password must include a lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    throw validationError("password must include a number");
  }
  return password;
}

export async function getInviteActivationView(
  tokenInput: string,
): Promise<InviteActivationView | null> {
  const token = assertInviteToken(tokenInput);
  const result = await getInviteInfoService({
    token,
    repos: getServerRuntime().team.invites.repos,
  });
  if (isErr(result)) {
    throw result.error;
  }
  return result.value;
}

export async function acceptInvitePasswordStep(input: {
  token: string;
  password: string;
}): Promise<AcceptInviteResult> {
  const token = assertInviteToken(input.token);
  const password = assertStrongPassword(input.password);
  const request = getRequestClientMetadata();

  const result = await submitInviteAcceptance(
    getServerRuntime().auth.inviteAcceptance,
    {
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    },
    { token, password },
  );

  if (isErr(result)) {
    return { ok: false, message: result.error.message };
  }

  setSessionCookie(result.value.sessionToken);
  return { ok: true, redirectTo: result.value.redirectTo };
}
