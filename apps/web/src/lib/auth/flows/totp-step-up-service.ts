import { verifyTotpStepUp } from "~/lib/auth/factors/totp-verifier";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { createLoginFlowsRepo } from "~/server/auth/repos-login-flows";
import type {
  createUserTotpFactorsRepo,
  createUserTotpRecoveryCodesRepo,
} from "~/server/auth/repos-user-totp-factors";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { createUsersRepo } from "~/server/users/repos-users";
import type { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

import { deleteLoginFlow } from "../login-flow/shared";
import {
  issueSessionTransition,
  type SessionRequestMetadata,
} from "../session/session-transition";
import type { LoginFlowLoginResult } from "./login-types";

type TotpStepUpDeps = {
  loginFlows: ReturnType<typeof createLoginFlowsRepo>;
  users: ReturnType<typeof createUsersRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  userTotpRecoveryCodes: ReturnType<typeof createUserTotpRecoveryCodesRepo>;
  webauthnChallenges: ReturnType<typeof createWebauthnChallengesRepo>;
};

export type SubmitTotpLoginError =
  | { kind: "flow_expired" }
  | { kind: "invalid_totp" };

export async function submitTotpForLoginFlow(
  input: {
    flowId: number;
    totpCode: string;
  } & SessionRequestMetadata,
  deps: TotpStepUpDeps,
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
