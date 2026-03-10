import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

import type { Role } from "~/lib/auth/access/rbac";
import { resolvePasswordStrongAuth } from "~/lib/auth/security/password-strong-auth";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import {
  beginPasskeyLoginFlow,
  finishPasskeyLoginFlow,
} from "./passkey/login-flow";
import { createPasskeyService } from "./passkey/passkey";
import {
  completePasswordLogin,
  getPasswordLoginNextStep,
  verifyPasswordLoginCredentials,
} from "./password/password-login";
import { issueLoginSession } from "./session/login-completion";

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

interface PasskeyLoginFlowState {
  id: number;
  identifier: string;
  state: "passkey";
  requestOptions: PublicKeyCredentialRequestOptionsJSON;
}

export type LoginFlowState = TotpLoginFlowState | PasskeyLoginFlowState;

export interface LoginFlowLoginResult {
  userId: number;
  role: Role;
  onboardingCompleted: boolean;
  token: string;
}

export type SubmitPasswordLoginError = {
  kind: "invalid_credentials" | "strong_auth_required";
};

export type SubmitTotpLoginError =
  | { kind: "flow_expired" }
  | { kind: "invalid_totp" };

export type SubmitPasskeyLoginError =
  | { kind: "flow_expired" }
  | { kind: "invalid_credentials" };

async function deleteLoginFlow(
  flow: Awaited<ReturnType<LoginFlowDeps["loginFlows"]["findById"]>>,
  deps: LoginFlowDeps,
): Promise<void> {
  if (!flow) return;
  if (flow.challenge_id) {
    await deps.webauthnChallenges.delete(flow.challenge_id);
  }
  await deps.loginFlows.delete(flow.id);
}

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
    if (!flow.user_id || !flow.challenge_id) {
      await deleteLoginFlow(flow, deps);
      return null;
    }

    const challenge = await deps.webauthnChallenges.findById(flow.challenge_id);
    if (
      !challenge ||
      challenge.type !== "authentication" ||
      challenge.user_id !== flow.user_id ||
      challenge.expires_at < Date.now()
    ) {
      await deleteLoginFlow(flow, deps);
      return null;
    }

    const passkeyService = createPasskeyService(deps);
    return {
      id: flow.id,
      identifier: flow.identifier,
      state: "passkey",
      requestOptions: await passkeyService.getAuthenticationOptionsForChallenge(
        flow.user_id,
        challenge.challenge,
      ),
    };
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
  deps: LoginFlowDeps,
): Promise<TotpLoginFlowState> {
  const flowId = await deps.loginFlows.create({
    identifier,
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

async function createPasskeyLoginFlow(
  identifier: string,
  ipAddress: string,
  deps: LoginFlowDeps,
): Promise<Result<PasskeyLoginFlowState, { kind: "invalid_credentials" }>> {
  const passkeyService = createPasskeyService(deps);
  const challenge = await beginPasskeyLoginFlow(
    identifier,
    ipAddress,
    deps,
    passkeyService,
  );
  if (isErr(challenge)) {
    return Err(challenge.error);
  }

  const flowId = await deps.loginFlows.create({
    identifier,
    user_id: challenge.value.userId,
    challenge_id: challenge.value.challengeId,
    state: "passkey",
    expires_at: Date.now() + config.auth.loginFlowTtlMs,
  });

  return Ok({
    id: flowId,
    identifier,
    state: "passkey",
    requestOptions: challenge.value.options,
  });
}

export async function startPasskeyLogin(
  input: {
    identifier: string;
    ipAddress: string;
  },
  deps: LoginFlowDeps,
): Promise<Result<PasskeyLoginFlowState, { kind: "invalid_credentials" }>> {
  const safeIdentifier = assertNonEmptyString(
    input.identifier,
    "identifier",
  ).trim();
  return createPasskeyLoginFlow(safeIdentifier, input.ipAddress, deps);
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
): Promise<
  Result<
    | { kind: "totp_required"; flow: LoginFlowState }
    | { kind: "passkey_required"; flow: LoginFlowState }
    | {
        kind: "complete";
        result: LoginFlowLoginResult;
      },
    SubmitPasswordLoginError
  >
> {
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

  const nextStep = await getPasswordLoginNextStep(user.value, deps);
  if (isErr(nextStep)) {
    if (nextStep.error.kind === "passkey_required") {
      const flow = await createPasskeyLoginFlow(
        safeIdentifier,
        input.ipAddress,
        deps,
      );
      if (isErr(flow)) {
        return Err({ kind: "invalid_credentials" });
      }

      return Ok({
        kind: "passkey_required",
        flow: flow.value,
      });
    }

    return Err(nextStep.error);
  }

  if (nextStep.value === "totp") {
    return Ok({
      kind: "totp_required",
      flow: await createTotpLoginFlow(safeIdentifier, user.value.id, deps),
    });
  }

  const result = await completePasswordLogin({
    user: user.value,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    authMethod: "password",
    strongAuthAt: null,
    deps,
    sendPrivilegedLoginAlert,
  });

  return Ok({ kind: "complete", result });
}

export async function submitPasskeyForLoginFlow(
  input: {
    flowId: number;
    response: AuthenticationResponseJSON;
    ipAddress: string;
    userAgent: string | null;
  },
  deps: LoginFlowDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<
  Result<
    { kind: "complete"; result: LoginFlowLoginResult },
    SubmitPasskeyLoginError
  >
> {
  const safeFlowId = assertPositiveInt(input.flowId, "flowId");
  const flow = await deps.loginFlows.findById(safeFlowId);

  if (
    !flow ||
    flow.state !== "passkey" ||
    flow.expires_at < Date.now() ||
    !flow.challenge_id
  ) {
    await deleteLoginFlow(flow, deps);
    return Err({ kind: "flow_expired" });
  }

  const passkeyService = createPasskeyService(deps);
  const verified = await finishPasskeyLoginFlow(
    flow.challenge_id,
    input.response,
    input.ipAddress,
    deps,
    passkeyService,
    sendPrivilegedLoginAlert,
  );
  await deps.loginFlows.delete(flow.id);

  if (isErr(verified)) {
    return Err(verified.error);
  }

  const user = await deps.users.findById(verified.value.userId);
  if (!user || !user.is_active) {
    return Err({ kind: "invalid_credentials" });
  }

  const session = await issueLoginSession({
    user,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    authMethod: "passkey",
    strongAuthAt: Date.now(),
    auditAction: "login_passkey",
    deps,
  });

  return Ok({ kind: "complete", result: session });
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

  const strongAuth = await resolvePasswordStrongAuth({
    user,
    ipAddress: input.ipAddress,
    totpCode: input.totpCode,
    deps,
  });
  if (isErr(strongAuth)) {
    return Err({
      kind:
        strongAuth.error.kind === "invalid_totp"
          ? "invalid_totp"
          : "flow_expired",
    });
  }

  const result = await completePasswordLogin({
    user,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    authMethod: strongAuth.value.authMethod,
    strongAuthAt: strongAuth.value.strongAuthAt,
    deps,
    sendPrivilegedLoginAlert,
  });
  await deps.loginFlows.delete(flow.id);

  return Ok({ kind: "complete", result });
}
