"use server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getRequestEvent } from "solid-js/web";

import {
  conflictError,
  internalError,
  validationError,
} from "~/lib/app-errors";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { requireSession } from "~/lib/auth/access/session";
import {
  createPasskeyAuthService,
  type PasskeyEnrollmentError,
} from "~/lib/auth/passkey/service";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import {
  issueAppSession,
  replaceCurrentSession,
} from "~/lib/auth/session/session-issuer";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import { Err, isErr, type Result } from "~/server/shared/result";
import {
  completeAccountOnboardingWithRepos,
  type CompleteOnboardingError,
} from "~/server/users/service-account-onboarding";

function normalizePeruvianPhone(value: string): string {
  const v = value.replace(/\s+/g, "").trim();
  if (/^\+51\d{9}$/.test(v)) return v;
  if (/^\d{9}$/.test(v)) return `+51${v}`;
  throw validationError("El número debe tener 9 dígitos");
}

function resolveRedirect(
  role: Awaited<ReturnType<typeof requireSession>>["role"],
) {
  return { redirectTo: getDefaultAppPath(role) };
}

async function promoteCompletedOnboardingSession(
  session: Awaited<ReturnType<typeof requireSession>>,
): Promise<void> {
  const user = await repos.users.findById(session.userId);
  if (!user) {
    throw internalError("No se pudo completar el registro");
  }

  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const userAgent = event?.request.headers.get("user-agent") ?? null;
  const strongAuthStatus = await getStrongAuthStatus(user.id, repos);
  const strongAuthMethod =
    session.strongAuthMethod ??
    (strongAuthStatus.hasPasskey
      ? "passkey"
      : strongAuthStatus.hasTotp
        ? "totp"
        : null);
  const strongAuthAt =
    strongAuthMethod === null ? null : (session.strongAuthAt ?? Date.now());

  const issued = await issueAppSession({
    user,
    ipAddress,
    userAgent,
    primaryAuthMethod: session.primaryAuthMethod,
    strongAuthMethod,
    strongAuthAt,
    deps: repos,
  });
  await replaceCurrentSession(issued.token);
}

function mapCompleteOnboardingError(error: CompleteOnboardingError): never {
  return mapOnboardingFailure(error, {
    strongAuthRequiredMessage: error.message,
  });
}

function mapOnboardingFailure(
  error: PasskeyEnrollmentError | CompleteOnboardingError,
  options: {
    strongAuthRequiredMessage?: string;
    userNotFoundMessage?: string;
  } = {},
): never {
  switch (error.reason) {
    case "invalid_request":
      throw internalError("No se pudo configurar la clave de acceso");
    case "user_not_found":
      throw internalError(
        options.userNotFoundMessage ?? "No se pudo completar el registro",
      );
    case "unexpected":
      throw internalError(error.message);
    case "strong_auth_required":
      throw conflictError(
        options.strongAuthRequiredMessage ?? "No se pudo completar el registro",
      );
  }

  const exhaustive: never = error;
  void exhaustive;
  throw internalError("Unexpected onboarding completion failure");
}

type CompletePasskeyOnboardingResult = Result<
  void,
  PasskeyEnrollmentError | CompleteOnboardingError
>;

export async function completeOnboarding(
  phoneE164: string,
): Promise<{ redirectTo: string }> {
  const session = await requireSession();
  const safePhone = normalizePeruvianPhone(phoneE164);
  const result = await runInRepositoryTransaction((transactionRepos) =>
    completeAccountOnboardingWithRepos(transactionRepos, {
      userId: session.userId,
      phoneE164: safePhone,
    }),
  );
  if (isErr(result)) {
    mapCompleteOnboardingError(result.error);
  }
  await promoteCompletedOnboardingSession(session);
  return resolveRedirect(session.role);
}

export async function completePasskeyOnboarding(
  phoneE164: string,
  challengeId: number,
  response: RegistrationResponseJSON,
): Promise<{ redirectTo: string }> {
  const session = await requireSession();
  const safePhone = normalizePeruvianPhone(phoneE164);
  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const result =
    await runInRepositoryTransaction<CompletePasskeyOnboardingResult>(
      async (transactionRepos) => {
        const passkeyService = createPasskeyAuthService(transactionRepos);
        const passkeyResult = await passkeyService.finishEnrollment({
          userId: session.userId,
          challengeId,
          response,
          ipAddress,
        });
        if (isErr(passkeyResult)) {
          return Err(passkeyResult.error);
        }

        return completeAccountOnboardingWithRepos(transactionRepos, {
          userId: session.userId,
          phoneE164: safePhone,
        });
      },
    );
  if (isErr(result)) {
    mapOnboardingFailure(result.error, {
      userNotFoundMessage: "No se pudo completar el registro",
    });
  }
  await promoteCompletedOnboardingSession(session);
  return resolveRedirect(session.role);
}
