import "server-only";
import type {
  AcceptInviteErrorCode,
  AcceptInviteResult,
  InviteActivationView,
} from "~/contracts/auth";
import { isValidInviteTokenFormat } from "~/domain/auth/invite/tokens";
import { submitInviteAcceptance } from "~/server/auth/flows/submit-invite-acceptance";
import { setSessionCookie } from "~/server/auth/session/cookies";
import { composeAuth } from "~/server/auth/ui/composition";
import { throwDomain } from "~/server/platform/action/domain-error";
import { executePublicServerFunction } from "~/server/platform/action/public-action";
import { getRequestClientMetadata } from "~/server/platform/http/request-context";
import { getInviteInfo as getInviteInfoService } from "~/server/team/application/invites";
import { composeTeam } from "~/server/team/ui/composition";
import { isErr } from "~/shared/result";

function readInviteToken(
  raw: string,
):
  | { ok: true; value: string }
  | { ok: false; code: "invalid_token"; message: string } {
  const token = raw.trim();
  if (!token || !isValidInviteTokenFormat(token)) {
    return {
      ok: false,
      code: "invalid_token",
      message: "El enlace de invitación no es válido.",
    };
  }
  return { ok: true, value: token };
}

function readStrongPassword(
  raw: string,
):
  | { ok: true; value: string }
  | { ok: false; code: AcceptInviteErrorCode; message: string } {
  if (!raw.trim()) {
    return {
      ok: false,
      code: "password_too_short",
      message: "La contraseña debe tener al menos 12 caracteres.",
    };
  }
  if (raw.length < 12) {
    return {
      ok: false,
      code: "password_too_short",
      message: "La contraseña debe tener al menos 12 caracteres.",
    };
  }
  if (!/[A-Z]/.test(raw)) {
    return {
      ok: false,
      code: "password_missing_uppercase",
      message: "La contraseña debe incluir una letra mayúscula.",
    };
  }
  if (!/[a-z]/.test(raw)) {
    return {
      ok: false,
      code: "password_missing_lowercase",
      message: "La contraseña debe incluir una letra minúscula.",
    };
  }
  if (!/[0-9]/.test(raw)) {
    return {
      ok: false,
      code: "password_missing_number",
      message: "La contraseña debe incluir un número.",
    };
  }
  return { ok: true, value: raw };
}

export async function getInviteActivationView(
  tokenInput: string,
): Promise<InviteActivationView | null> {
  return executePublicServerFunction(async () => {
    const safeToken = readInviteToken(tokenInput);
    if (!safeToken.ok) {
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
  });
}

export async function acceptInvitePasswordStep(input: {
  token: string;
  password: string;
  confirmPassword?: string;
}): Promise<AcceptInviteResult> {
  return executePublicServerFunction(async () => {
    if (
      input.confirmPassword !== undefined &&
      input.password !== input.confirmPassword
    ) {
      return {
        ok: false,
        code: "password_mismatch",
        message: "Las contraseñas no coinciden.",
      };
    }

    const token = readInviteToken(input.token);
    if (!token.ok) {
      return token;
    }
    const password = readStrongPassword(input.password);
    if (!password.ok) {
      return password;
    }
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
      switch (result.error.code) {
        case "invite_invalid_or_expired":
          return {
            ok: false,
            code: "invite_invalid_or_expired",
            message: "Esta invitación no es válida o ya expiró.",
          };
        case "invite_target_active":
          return {
            ok: false,
            code: "invite_target_active",
            message: "Esta cuenta ya fue activada.",
          };
        default:
          throwDomain(result.error);
      }
    }

    setSessionCookie(result.value.sessionToken);
    return { ok: true, redirectTo: result.value.redirectTo };
  });
}
