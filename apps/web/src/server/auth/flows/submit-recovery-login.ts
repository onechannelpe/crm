import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import type {
  LoginFlowLoginResult,
  SubmitRecoveryLoginError,
} from "~/server/auth/application/contracts";
import { verifyRecoveryCode } from "~/server/auth/factors/recovery";
import type { AuthLoginDeps } from "~/server/auth/flows/login-deps";
import type { SessionRequestMetadata } from "~/server/auth/session/session-spec";
import { createSessionService } from "~/server/auth/session/session.service";
import type { AuthLoginFlowId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

// Recovery codes complete either pending TOTP or passkey flow because they are
// account-level rather than factor-specific.
export async function submitRecoveryForLoginFlow(
  input: {
    flowId: AuthLoginFlowId;
    recoveryCode: string;
  } & SessionRequestMetadata,
  deps: AuthLoginDeps,
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert,
): Promise<
  Result<
    { kind: "complete"; result: LoginFlowLoginResult },
    SubmitRecoveryLoginError
  >
> {
  const flow = await deps.loginFlows.findById(input.flowId);

  const isStrongAuthFlow = flow?.state === "totp" || flow?.state === "passkey";
  if (!flow || !isStrongAuthFlow || flow.expires_at < new Date()) {
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

  const redeemed = await verifyRecoveryCode({
    user,
    ipAddress: input.ipAddress,
    recoveryCode: input.recoveryCode,
    deps,
  });
  if (isErr(redeemed)) {
    return Err({ kind: "invalid_recovery" });
  }

  await sendAlertOnNewLoginSource({
    user,
    ipAddress: input.ipAddress,
    method: `${flow.primary_auth_method}+recovery`,
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
    strongAuthMethod: redeemed.value.strongAuthMethod,
    strongAuthAt: redeemed.value.strongAuthAt,
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
