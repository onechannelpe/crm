import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { createRequestPasskeyProviderFactory } from "~/actions/auth/shared/request-passkey-provider";
import { submitPasswordLogin } from "~/lib/auth/flows/primary-login-service";
import { submitTotpForLoginFlow } from "~/lib/auth/flows/totp-step-up-service";
import {
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
} from "~/lib/auth/passkey/service";
import { replaceCurrentSession } from "~/lib/auth/session/session-transition";

import { getDefaultAppPath } from "./domain";
import { authRepos, privilegedLoginAlertSender } from "./repos";

export function createPasskeyStartService() {
  return createPasskeyLoginStartAuthService(authRepos, {
    createWebauthnProvider: createRequestPasskeyProviderFactory(),
  });
}

export function submitPasswordLoginWithRepos(input: {
  identifier: string;
  password: string;
  ipAddress: string;
  userAgent: string | null;
}) {
  return submitPasswordLogin(input, authRepos, privilegedLoginAlertSender);
}

export function submitTotpLoginWithRepos(input: {
  flowId: number;
  totpCode: string;
  ipAddress: string;
  userAgent: string | null;
}) {
  return submitTotpForLoginFlow(input, authRepos, privilegedLoginAlertSender);
}

export async function finishPasskeyLoginWithRepos(input: {
  flowId: number;
  response: AuthenticationResponseJSON;
  ipAddress: string;
  userAgent: string | null;
}) {
  const service = createPasskeyLoginFinishAuthService(authRepos, {
    createWebauthnProvider: createRequestPasskeyProviderFactory(),
  });
  return service.finishLogin({
    ...input,
    sendPrivilegedLoginAlert: privilegedLoginAlertSender,
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
