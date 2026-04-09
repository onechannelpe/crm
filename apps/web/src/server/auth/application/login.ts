import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import type { AuthContext } from "~/lib/auth/context/auth-context";
import { verifyTotpStepUp } from "~/lib/auth/factors/totp-verifier";
import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { createPasskeyProvider } from "~/lib/auth/providers/passkey-provider";
import { evaluateLoginPolicy } from "~/lib/auth/policy/login-policy";
import type { AuthProof } from "~/lib/auth/policy/policy-types";
import { authenticatePassword } from "~/lib/auth/providers/password-provider";
import {
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
  createPasskeyLoginStateService,
  type PasskeyLoginFlowState,
} from "~/lib/auth/passkey/service";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import {
  issueLoginSession,
  issueSessionTransition,
  replaceCurrentSession,
  type SessionRequestMetadata,
} from "~/lib/auth/session/session-transition";
import { config } from "~/lib/config";
import { assertNonEmptyString, assertPositiveInt } from "~/lib/contracts/guards";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type {
  AuthLoginContext,
  AuthLoginRepos,
} from "../infrastructure/login-context";

export interface TotpLoginFlowState {
  id: number;
  identifier: string;
  state: "totp";
}

export type LoginFlowState = TotpLoginFlowState | PasskeyLoginFlowState;

export interface LoginFlowLoginResult {
  userId: number;
  role: Parameters<typeof getDefaultAppPath>[0];
  onboardingCompleted: boolean;
  token: string;
}

export type SubmitPrimaryLoginResult =
  | { kind: "totp_required"; flow: TotpLoginFlowState }
  | { kind: "passkey_required"; flow: PasskeyLoginFlowState }
  | { kind: "complete"; result: LoginFlowLoginResult };

export type SubmitPrimaryLoginError =
  | {
      kind: "invalid_credentials" | "strong_auth_required";
    }
  | {
      kind: "unexpected";
      message: string;
    };

export type SubmitTotpLoginError =
  | { kind: "flow_expired" }
  | { kind: "invalid_totp" };

type PasskeyStartProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginStartAuthService>[1]
>["createWebauthnProvider"];

type PasskeyFinishProviderFactory = NonNullable<
  Parameters<typeof createPasskeyLoginFinishAuthService>[1]
>["createWebauthnProvider"];

export function createPasskeyStartService(
  repos: AuthLoginRepos,
  input: {
    createWebauthnProvider: PasskeyStartProviderFactory;
  },
) {
  return createPasskeyLoginStartAuthService(repos, {
    createWebauthnProvider: input.createWebauthnProvider,
  });
}

async function createTotpLoginFlow(
  identifier: string,
  userId: number,
  primaryAuthMethod: "password" | "google" | "passkey",
  deps: { loginFlows: AuthLoginRepos["loginFlows"] },
): Promise<TotpLoginFlowState> {
  const flowId = await deps.loginFlows.create({
    identifier,
    primary_auth_method: primaryAuthMethod,
    user_id: userId,
    challenge_id: null,
    state: "totp",
    expires_at: Date.now() + config.auth.loginFlowTtlMs,
  });

  return {
    id: flowId,
    identifier,
    state: "totp",
  };
}

async function completePrimaryAuthProof(params: {
  proof: AuthProof;
  identifier: string;
  request: SessionRequestMetadata;
  context?: AuthContext;
  deps: AuthLoginRepos;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const context =
    params.context ??
    (await loadActiveAuthContext(params.proof.userId, params.deps));
  if (!context) {
    return Err({ kind: "invalid_credentials" });
  }

  const decision = evaluateLoginPolicy({
    proof: params.proof,
    context,
  });

  if (decision.kind === "deny") {
    return Err({ kind: decision.reason });
  }

  if (decision.kind === "require_totp") {
    return Ok({
      kind: "totp_required",
      flow: await createTotpLoginFlow(
        params.identifier,
        context.user.id,
        params.proof.kind,
        params.deps,
      ),
    });
  }

  if (decision.kind === "require_passkey") {
    const flow = await createPasskeyLoginStartAuthService(
      params.deps,
    ).beginLogin({
      identifier: params.identifier,
      ipAddress: params.request.ipAddress,
      mode: "identified",
      primaryAuthMethod: params.proof.kind,
    });
    if (isErr(flow)) {
      if (flow.error.kind === "unexpected") {
        return Err(flow.error);
      }

      return Err({ kind: "invalid_credentials" });
    }

    return Ok({
      kind: "passkey_required",
      flow: flow.value,
    });
  }

  await sendAlertOnNewLoginSource({
    user: context.user,
    ipAddress: params.request.ipAddress,
    method: params.proof.kind,
    deps: params.deps,
    sendPrivilegedLoginAlert: params.sendPrivilegedLoginAlert,
  });

  const issued = await issueLoginSession({
    user: context.user,
    decision,
    request: params.request,
    primaryAuthMethod: params.proof.kind,
    auditAction: params.proof.kind === "passkey" ? "login_passkey" : "login",
    deps: params.deps,
  });

  return Ok({
    kind: "complete",
    result: {
      userId: issued.userId,
      role: issued.role,
      onboardingCompleted: issued.onboardingCompleted,
      token: issued.token,
    },
  });
}

export async function submitPasswordLogin(
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
    userAgent: string | null;
  },
  deps: AuthLoginRepos,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const safeIdentifier = assertNonEmptyString(
    input.identifier,
    "identifier",
  ).trim();
  const proof = await authenticatePassword(
    {
      identifier: safeIdentifier,
      password: input.password,
      ipAddress: input.ipAddress,
    },
    deps,
  );
  if (isErr(proof)) {
    return Err(proof.error);
  }

  return completePrimaryAuthProof({
    proof: proof.value,
    identifier: safeIdentifier,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    deps,
    sendPrivilegedLoginAlert,
  });
}

export async function submitGoogleLogin(
  input: {
    userId: number;
    ipAddress: string;
    userAgent: string | null;
    trustedFederatedMfa?: boolean;
  },
  deps: AuthLoginRepos,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const proof: Extract<AuthProof, { kind: "google" }> = {
    kind: "google",
    userId: input.userId,
    trustedFederatedMfa: input.trustedFederatedMfa === true,
  };
  const context = await loadActiveAuthContext(proof.userId, deps);
  if (!context) {
    return Err({ kind: "invalid_credentials" });
  }

  return completePrimaryAuthProof({
    proof,
    identifier: context.user.username,
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    context,
    deps,
    sendPrivilegedLoginAlert,
  });
}

export async function submitTotpForLoginFlow(
  input: {
    flowId: number;
    totpCode: string;
  } & SessionRequestMetadata,
  deps: AuthLoginRepos,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<
  Result<
    { kind: "complete"; result: LoginFlowLoginResult },
    SubmitTotpLoginError
  >
> {
  const safeFlowId = assertPositiveInt(input.flowId, "flowId");
  const flow = await deps.loginFlows.findById(safeFlowId);

  if (!flow || flow.state !== "totp" || flow.expires_at < Date.now()) {
    await deleteLoginFlow(flow, deps);
    return Err({ kind: "flow_expired" });
  }
  if (!flow.user_id) {
    await deps.loginFlows.delete(flow.id);
    return Err({ kind: "flow_expired" });
  }

  const user = await deps.users.findById(flow.user_id);
  if (!user || !user.is_active) {
    await deps.loginFlows.delete(flow.id);
    return Err({ kind: "flow_expired" });
  }

  const stepUp = await verifyTotpStepUp({
    user,
    ipAddress: input.ipAddress,
    totpCode: input.totpCode,
    deps,
  });
  if (isErr(stepUp)) {
    return Err({
      kind:
        stepUp.error.kind === "invalid_totp" ? "invalid_totp" : "flow_expired",
    });
  }

  await sendAlertOnNewLoginSource({
    user,
    ipAddress: input.ipAddress,
    method: `${flow.primary_auth_method}+totp`,
    deps,
    sendPrivilegedLoginAlert,
  });
  const result = await issueSessionTransition({
    user,
    sessionClass: "app",
    request: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
    primaryAuthMethod: flow.primary_auth_method,
    strongAuthMethod: stepUp.value.strongAuthMethod,
    strongAuthAt: stepUp.value.strongAuthAt,
    auditAction: "login",
    deps,
  });
  await deps.loginFlows.delete(flow.id);

  return Ok({
    kind: "complete",
    result: {
      userId: result.userId,
      role: result.role,
      onboardingCompleted: result.onboardingCompleted,
      token: result.token,
    },
  });
}

export function submitPasswordLoginWithDeps(
  deps: AuthLoginContext,
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
    userAgent: string | null;
  },
) {
  return submitPasswordLogin(input, deps.repos, deps.privilegedLoginAlertSender);
}

export function submitTotpLoginWithDeps(
  deps: AuthLoginContext,
  input: {
    flowId: number;
    totpCode: string;
    ipAddress: string;
    userAgent: string | null;
  },
) {
  return submitTotpForLoginFlow(input, deps.repos, deps.privilegedLoginAlertSender);
}

export async function finishPasskeyLoginWithDeps(
  deps: AuthLoginContext,
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

async function readActiveLoginFlow(
  flowId: number,
  deps: AuthLoginRepos,
): Promise<LoginFlowState | null> {
  const safeFlowId = assertPositiveInt(flowId, "flowId");
  const flow = await deps.loginFlows.findById(safeFlowId);

  if (!flow) return null;
  if (flow.expires_at < Date.now()) {
    await deleteLoginFlow(flow, deps);
    return null;
  }

  if (flow.state === "totp") {
    return {
      id: flow.id,
      identifier: flow.identifier,
      state: "totp",
    };
  }

  if (flow.state === "passkey") {
    return createPasskeyLoginStateService(deps, {
      webauthnService: createPasskeyProvider(deps),
    }).hydrateLoginFlow(flow);
  }

  await deleteLoginFlow(flow, deps);
  return null;
}

export async function getLoginFlowState(
  flowId: number,
  deps: AuthLoginRepos,
): Promise<LoginFlowState | null> {
  return readActiveLoginFlow(flowId, deps);
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
