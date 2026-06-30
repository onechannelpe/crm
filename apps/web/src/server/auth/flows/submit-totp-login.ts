import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type {
  LoginFlowLoginResult,
  SubmitTotpLoginError,
} from "~/server/auth/application/contracts";
import { verifyTotpStepUp } from "~/server/auth/factors/totp";
import type { AuthLoginDeps } from "~/server/auth/flows/login-deps";
import type { SessionRequestMetadata } from "~/server/auth/session/session-spec";
import { createSessionService } from "~/server/auth/session/session.service";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

export async function submitTotpForLoginFlow(
  input: {
    flowId: string;
    totpCode: string;
  } & SessionRequestMetadata,
  deps: AuthLoginDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<
  Result<
    { kind: "complete"; result: LoginFlowLoginResult },
    SubmitTotpLoginError
  >
> {
  const flow = await deps.loginFlows.findById(input.flowId);

  if (!flow || flow.state !== "totp" || flow.expires_at < new Date()) {
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
  const result = await createSessionService(deps).establish({
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
