import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { submitPasswordLogin } from "~/lib/auth/flows/primary-login-service";
import { submitTotpForLoginFlow } from "~/lib/auth/flows/totp-step-up-service";
import {
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
} from "~/lib/auth/passkey/service";
import { replaceCurrentSession } from "~/lib/auth/session/session-transition";

import type { AuthDeps } from "../infrastructure/deps";

type PasskeyStartProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginStartAuthService>[1]
>["createWebauthnProvider"];

type PasskeyFinishProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginFinishAuthService>[1]
>["createWebauthnProvider"];

export function createPasskeyStartService(
  deps: Pick<AuthDeps, "repos">,
  input: {
    createWebauthnProvider: PasskeyStartProviderFactory;
  },
) {
  return createPasskeyLoginStartAuthService(deps.repos, {
    createWebauthnProvider: input.createWebauthnProvider,
  });
}

export function submitPasswordLoginWithDeps(
  deps: Pick<AuthDeps, "repos" | "privilegedLoginAlertSender">,
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
    userAgent: string | null;
  },
) {
  return submitPasswordLogin(
    input,
    deps.repos,
    deps.privilegedLoginAlertSender,
  );
}

export function submitTotpLoginWithDeps(
  deps: Pick<AuthDeps, "repos" | "privilegedLoginAlertSender">,
  input: {
    flowId: number;
    totpCode: string;
    ipAddress: string;
    userAgent: string | null;
  },
) {
  return submitTotpForLoginFlow(
    input,
    deps.repos,
    deps.privilegedLoginAlertSender,
  );
}

export async function finishPasskeyLoginWithDeps(
  deps: Pick<AuthDeps, "repos" | "privilegedLoginAlertSender">,
  input: {
    flowId: number;
    response: AuthenticationResponseJSON;
    ipAddress: string;
    userAgent: string | null;
    createWebauthnProvider: PasskeyFinishProviderFactory;
  },
) {
  const service = createPasskeyLoginFinishAuthService(deps.repos, {
    createWebauthnProvider: input.createWebauthnProvider,
  });
  return service.finishLogin({
    flowId: input.flowId,
    response: input.response,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    sendPrivilegedLoginAlert: deps.privilegedLoginAlertSender,
  });
}

export async function replaceCurrentSessionAndResolveRedirect(input: {
  token: string;
  onboardingCompleted: boolean;
  role: Parameters<typeof getDefaultAppPath>[0];
}) {
  await replaceCurrentSession(input.token);
  return input.onboardingCompleted
    ? getDefaultAppPath(input.role)
    : "/onboarding";
}
