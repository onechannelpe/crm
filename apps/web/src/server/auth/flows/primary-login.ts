import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import type { AuthContext } from "~/lib/auth/context/auth-context";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { config } from "~/lib/config";
import type {
  SubmitPrimaryLoginError,
  SubmitPrimaryLoginResult,
  TotpLoginFlowState,
} from "~/server/auth/application/contracts";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { createPasskeyLoginStartAuthService } from "~/server/auth/factors/passkey/service";
import type { AuthLoginDeps } from "~/server/auth/flows/login-deps";
import { evaluateLoginPolicy } from "~/server/auth/policy/engine";
import type { AuthProof } from "~/server/auth/policy/types";
import type { SessionRequestMetadata } from "~/server/auth/session/session-spec";
import { createSessionService } from "~/server/auth/session/session.service";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

async function createTotpLoginFlow(
  identifier: string,
  userId: UserId,
  primaryAuthMethod: "password" | "google" | "passkey",
  deps: Pick<AuthLoginDeps, "loginFlows">,
): Promise<TotpLoginFlowState> {
  const flowId = await deps.loginFlows.create({
    identifier,
    primary_auth_method: primaryAuthMethod,
    user_id: userId,
    challenge_id: null,
    state: "totp",
    expires_at: new Date(Date.now() + config.auth.loginFlowTtlMs),
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
  deps: AuthLoginDeps;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
  webauthnProvider: WebauthnProvider;
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
    const flow = await createPasskeyLoginStartAuthService(params.deps, {
      webauthnProvider: params.webauthnProvider,
    }).beginLogin({
      identifier: params.identifier,
      ipAddress: params.request.ipAddress,
      mode: "identified",
      primaryAuthMethod: params.proof.kind,
    });
    if (isErr(flow)) {
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

  const issued = await createSessionService(params.deps).establish({
    user: context.user,
    sessionClass: decision.sessionClass,
    request: params.request,
    primaryAuthMethod: params.proof.kind,
    strongAuthMethod: decision.strongAuthMethod,
    strongAuthAt: decision.strongAuthAt,
    auditAction: params.proof.kind === "passkey" ? "login_passkey" : "login",
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
