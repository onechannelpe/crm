import type { Role } from "~/lib/auth/access/rbac";
import { evaluateLoginPolicy } from "~/lib/auth/core/login-policy";
import type { PrimaryAuthMethod } from "~/lib/auth/core/session-contract";
import { verifyTotpStepUp } from "~/lib/auth/factors/totp-verifier";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { deleteLoginFlow } from "./login-flow/shared";
import {
  createPasskeyAuthService,
  type PasskeyLoginFlowState,
} from "./passkey/service";
import { verifyPasswordLoginCredentials } from "./password/password-login";
import { issueAppSession, issuePreAuthSession } from "./session/session-issuer";

type LoginFlowDeps = Pick<
  Repositories,
  | "loginFlows"
  | "users"
  | "sessions"
  | "auditLogs"
  | "authThrottle"
  | "authEvents"
  | "userTotpFactors"
  | "userTotpRecoveryCodes"
  | "passkeys"
  | "webauthnChallenges"
>;

interface TotpLoginFlowState {
  id: number;
  identifier: string;
  state: "totp";
}

export type LoginFlowState = TotpLoginFlowState | PasskeyLoginFlowState;

export interface LoginFlowLoginResult {
  userId: number;
  role: Role;
  onboardingCompleted: boolean;
  token: string;
}

export type SubmitPasswordLoginError =
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

type SubmitPrimaryLoginResult =
  | { kind: "totp_required"; flow: LoginFlowState }
  | { kind: "passkey_required"; flow: PasskeyLoginFlowState }
  | { kind: "complete"; result: LoginFlowLoginResult };

async function readActiveLoginFlow(
  flowId: number,
  deps: LoginFlowDeps,
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
    return createPasskeyAuthService(deps).hydrateLoginFlow(flow);
  }

  await deleteLoginFlow(flow, deps);
  return null;
}

export async function getLoginFlowState(
  flowId: number,
  deps: LoginFlowDeps,
): Promise<LoginFlowState | null> {
  return readActiveLoginFlow(flowId, deps);
}

async function createTotpLoginFlow(
  identifier: string,
  userId: number,
  primaryAuthMethod: PrimaryAuthMethod,
  deps: LoginFlowDeps,
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

async function completePrimaryLogin(params: {
  user: Awaited<ReturnType<LoginFlowDeps["users"]["findById"]>>;
  identifier: string;
  ipAddress: string;
  userAgent: string | null;
  primaryAuthMethod: PrimaryAuthMethod;
  trustedFederatedMfa?: boolean;
  deps: LoginFlowDeps;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}): Promise<Result<SubmitPrimaryLoginResult, SubmitPasswordLoginError>> {
  const { user } = params;
  if (!user) {
    return Err({ kind: "invalid_credentials" });
  }
  const strongAuthStatus = await getStrongAuthStatus(user.id, params.deps);
  const decision = evaluateLoginPolicy({
    user,
    strongAuthStatus,
    primaryAuthMethod: params.primaryAuthMethod,
    trustedFederatedMfa: params.trustedFederatedMfa,
  });

  if (decision.kind === "deny") {
    return Err({ kind: decision.reason });
  }

  if (decision.kind === "require_totp") {
    return Ok({
      kind: "totp_required",
      flow: await createTotpLoginFlow(
        params.identifier,
        user.id,
        params.primaryAuthMethod,
        params.deps,
      ),
    });
  }

  if (decision.kind === "require_passkey") {
    const flow = await createPasskeyAuthService(params.deps).beginLogin({
      identifier: params.identifier,
      ipAddress: params.ipAddress,
      primaryAuthMethod: params.primaryAuthMethod,
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
    user,
    ipAddress: params.ipAddress,
    method: params.primaryAuthMethod,
    deps: params.deps,
    sendPrivilegedLoginAlert: params.sendPrivilegedLoginAlert,
  });

  const issued =
    decision.kind === "issue_app_session"
      ? await issueAppSession({
          user,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          primaryAuthMethod: params.primaryAuthMethod,
          strongAuthMethod: decision.strongAuthMethod,
          strongAuthAt: decision.strongAuthAt,
          auditAction:
            params.primaryAuthMethod === "passkey" ? "login_passkey" : "login",
          deps: params.deps,
        })
      : await issuePreAuthSession({
          user,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          primaryAuthMethod: params.primaryAuthMethod,
          strongAuthMethod: decision.strongAuthMethod,
          strongAuthAt: decision.strongAuthAt,
          auditAction:
            params.primaryAuthMethod === "passkey" ? "login_passkey" : "login",
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
  deps: LoginFlowDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPasswordLoginError>> {
  const safeIdentifier = assertNonEmptyString(
    input.identifier,
    "identifier",
  ).trim();

  const user = await verifyPasswordLoginCredentials(
    {
      username: safeIdentifier,
      password: input.password,
      ipAddress: input.ipAddress,
    },
    { repos: deps },
  );
  if (isErr(user)) {
    return Err({ kind: "invalid_credentials" });
  }

  return completePrimaryLogin({
    user: user.value,
    identifier: safeIdentifier,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    primaryAuthMethod: "password",
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
  deps: LoginFlowDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<Result<SubmitPrimaryLoginResult, SubmitPasswordLoginError>> {
  const user = await deps.users.findById(input.userId);
  if (!user || !user.is_active) {
    return Err({ kind: "invalid_credentials" });
  }

  return completePrimaryLogin({
    user,
    identifier: user.username,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    primaryAuthMethod: "google",
    trustedFederatedMfa: input.trustedFederatedMfa,
    deps,
    sendPrivilegedLoginAlert,
  });
}

export async function submitTotpForLoginFlow(
  input: {
    flowId: number;
    totpCode: string;
    ipAddress: string;
    userAgent: string | null;
  },
  deps: LoginFlowDeps,
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
  const result = await issueAppSession({
    user,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
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
