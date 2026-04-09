import { verifyTotpStepUp } from "~/lib/auth/factors/totp-verifier";
import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import {
  issueSessionTransition,
  type SessionRequestMetadata,
} from "~/lib/auth/session/session-transition";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { AuthLoginRepos } from "~/server/auth/infrastructure/login-context";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type { LoginFlowLoginResult, SubmitTotpLoginError } from "./types";

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
