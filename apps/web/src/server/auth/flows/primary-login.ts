import type { AuthContext } from "~/lib/auth/context/auth-context";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { enqueueAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import { config } from "~/lib/config";
import type {
  SubmitPrimaryLoginError,
  SubmitPrimaryLoginResult,
  TotpLoginFlowState,
} from "~/server/auth/application/contracts";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import {
  persistPasskeyLoginFlow,
  preparePasskeyLogin,
  type PreparedPasskeyLogin,
} from "~/server/auth/factors/passkey/service";
import type { AuthLoginRepos } from "~/server/auth/flows/login-deps";
import type { AuthLoginContext } from "~/server/auth/infrastructure/login-context";
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
  occurredAt: Date,
  deps: Pick<AuthLoginRepos, "loginFlows">,
): Promise<TotpLoginFlowState> {
  const flowId = await deps.loginFlows.create({
    identifier,
    primary_auth_method: primaryAuthMethod,
    user_id: userId,
    challenge_id: null,
    state: "totp",
    expires_at: new Date(occurredAt.getTime() + config.auth.loginFlowTtlMs),
    created_at: occurredAt,
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
  context: AuthContext;
  deps: AuthLoginContext;
  webauthnProvider: WebauthnProvider;
}): Promise<Result<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>> {
  const authenticatedAt = params.deps.now();
  const decision = evaluateLoginPolicy({
    proof: params.proof,
    context: params.context,
  });

  if (decision.kind === "deny") {
    return Err({ kind: decision.reason });
  }

  let preparedPasskey: PreparedPasskeyLogin | null = null;
  if (decision.kind === "require_passkey") {
    const prepared = await preparePasskeyLogin(
      params.deps.repos,
      params.webauthnProvider,
      {
        identifier: params.identifier,
        ipAddress: params.request.ipAddress,
        mode: "identified",
        primaryAuthMethod: params.proof.kind,
        occurredAt: authenticatedAt,
        account: { kind: "authenticated", user: params.context.user },
      },
    );
    if (isErr(prepared)) return Err({ kind: "invalid_credentials" });
    preparedPasskey = prepared.value;
  }

  return params.deps.uow.run<SubmitPrimaryLoginResult, SubmitPrimaryLoginError>(
    async (repos) => {
      if (params.proof.kind === "password") {
        await createAuthThrottleService({
          authThrottle: repos.authThrottle,
          now: () => authenticatedAt,
        }).clearLoginFailureState(params.identifier, params.request.ipAddress);
        await recordAuthEvent(repos, {
          userId: params.context.user.id,
          identifier: params.identifier,
          ipAddress: params.request.ipAddress,
          method: "password",
          stage: "login",
          outcome: "success",
          occurredAt: authenticatedAt,
        });
      }

      if (decision.kind === "require_totp") {
        return Ok({
          kind: "totp_required",
          flow: await createTotpLoginFlow(
            params.identifier,
            params.context.user.id,
            params.proof.kind,
            authenticatedAt,
            repos,
          ),
        });
      }

      if (decision.kind === "require_passkey") {
        if (!preparedPasskey) {
          return Err({ kind: "invalid_credentials" });
        }
        const flow = await persistPasskeyLoginFlow(repos, preparedPasskey);
        return Ok({ kind: "passkey_required", flow });
      }

      await enqueueAlertOnNewLoginSource({
        user: params.context.user,
        ipAddress: params.request.ipAddress,
        method: params.proof.kind,
        occurredAt: authenticatedAt,
        deps: repos,
      });

      const issued = await createSessionService({
        ...repos,
        now: () => authenticatedAt,
      }).establish({
        user: params.context.user,
        sessionClass: decision.sessionClass,
        request: params.request,
        primaryAuthMethod: params.proof.kind,
        strongAuthMethod: decision.strongAuthMethod,
        strongAuthAt: decision.strongAuthAt,
        auditAction:
          params.proof.kind === "passkey" ? "login_passkey" : "login",
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
    },
  );
}
