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
  createPasskeyAuthService,
  type PasskeyLoginFlowState,
} from "./passkey/service";
import {
  completePasswordLogin,
  getPasswordLoginNextStep,
  verifyPasswordLoginCredentials,
} from "./password/password-login";

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
    return createPasskeyAuthService(deps).getLoginFlowState(flow.id);
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
      const flow = await createPasskeyAuthService(deps).beginLogin({
        identifier: safeIdentifier,
        ipAddress: input.ipAddress,
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
