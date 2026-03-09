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
>;

export interface LoginFlowState {
  id: number;
  identifier: string;
  state: "totp";
}

export interface LoginFlowLoginResult {
  userId: number;
  role: Role;
  onboardingCompleted: boolean;
  token: string;
}

export type SubmitPasswordLoginError = {
  kind: "invalid_credentials";
};

export type SubmitTotpLoginError =
  | { kind: "flow_expired" }
  | { kind: "invalid_totp" };

async function readActiveLoginFlow(
  flowId: number,
  deps: LoginFlowDeps,
): Promise<LoginFlowState | null> {
  const safeFlowId = assertPositiveInt(flowId, "flowId");
  const flow = await deps.loginFlows.findById(safeFlowId);

  if (!flow) return null;
  if (flow.expires_at < Date.now()) {
    await deps.loginFlows.delete(flow.id);
    return null;
  }

  if (flow.state !== "totp") {
    await deps.loginFlows.delete(flow.id);
    return null;
  }

  return {
    id: flow.id,
    identifier: flow.identifier,
    state: "totp",
  };
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
): Promise<LoginFlowState> {
  const flowId = await deps.loginFlows.create({
    identifier,
    user_id: userId,
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
    return Err({ kind: "invalid_credentials" });
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
    if (flow?.expires_at && flow.expires_at < Date.now()) {
      await deps.loginFlows.delete(flow.id);
    }
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
