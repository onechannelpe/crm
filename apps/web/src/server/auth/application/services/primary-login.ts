import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import type { AuthContext } from "~/lib/auth/context/auth-context";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import {
  issueLoginSession,
  type SessionRequestMetadata,
} from "~/lib/auth/session/session-transition";
import { config } from "~/lib/config";
import type { AuthLoginRepos } from "~/server/auth/infrastructure/login-context";
import { createPasskeyLoginStartAuthService } from "~/server/auth/passkey/service";
import { evaluateLoginPolicy } from "~/server/auth/policy/engine";
import type { AuthProof } from "~/server/auth/policy/types";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type {
  SubmitPrimaryLoginError,
  SubmitPrimaryLoginResult,
  TotpLoginFlowState,
} from "../contracts";

async function createTotpLoginFlow(
  identifier: string,
  userId: UserId,
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

export async function completePrimaryAuthProof(params: {
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
