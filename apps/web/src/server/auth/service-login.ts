import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { createRequestPasskeyProviderFactory } from "~/actions/auth/shared/request-passkey-provider";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { submitPasswordLogin } from "~/lib/auth/flows/primary-login-service";
import { submitTotpForLoginFlow } from "~/lib/auth/flows/totp-step-up-service";
import {
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
} from "~/lib/auth/passkey/service";
import { replaceCurrentSession } from "~/lib/auth/session/session-transition";
import { privilegedLoginAlertSender, repos } from "~/server/shared/context";

export function createPasskeyStartService() {
  return createPasskeyLoginStartAuthService(repos, {
    createWebauthnProvider: createRequestPasskeyProviderFactory(),
  });
}

export function submitPasswordLoginWithRepos(input: {
  identifier: string;
  password: string;
  ipAddress: string;
  userAgent: string | null;
}) {
  return submitPasswordLogin(input, repos, privilegedLoginAlertSender);
}

export function submitTotpLoginWithRepos(input: {
  flowId: number;
  totpCode: string;
  ipAddress: string;
  userAgent: string | null;
}) {
  return submitTotpForLoginFlow(input, repos, privilegedLoginAlertSender);
}

export async function finishPasskeyLoginWithRepos(input: {
  flowId: number;
  response: AuthenticationResponseJSON;
  ipAddress: string;
  userAgent: string | null;
}) {
  const service = createPasskeyLoginFinishAuthService(repos, {
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
