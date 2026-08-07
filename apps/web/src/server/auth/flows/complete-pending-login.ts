import { resolveSessionClass } from "~/domain/auth/core/session-contract";
import type { LoginFlowLoginResult } from "~/server/auth/application/login-contracts";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import { loadActiveAuthContextForUser } from "~/server/auth/context/auth-context";
import type { VerifiedPasskeyLogin } from "~/server/auth/factors/passkey/service/login-finish";
import type { AuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { recordAuthEvent } from "~/server/auth/security/auth-events";
import { enqueueAlertOnNewLoginSource } from "~/server/auth/security/login-source-alert";
import type { SessionRequestMetadata } from "~/server/auth/session/session-spec";
import { createAuditedSessionIssuer } from "~/server/auth/session/session.service";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type {
  VerifiedRecoveryLoginProof,
  VerifiedTotpLoginProof,
} from "./verify-pending-login";

type VerifiedPendingLoginProof =
  | VerifiedPasskeyLogin
  | VerifiedRecoveryLoginProof
  | VerifiedTotpLoginProof;

type CompletePendingLoginError =
  | { kind: "flow_expired" }
  | { kind: "invalid_credentials" }
  | { kind: "invalid_recovery" };

function flowMatchesProof(
  flow: NonNullable<
    Awaited<ReturnType<AuthLoginContext["repos"]["loginFlows"]["findById"]>>
  >,
  proof: VerifiedPendingLoginProof,
): boolean {
  switch (proof.method) {
    case "passkey":
      return (
        flow.state === "passkey" && flow.challenge_id === proof.challengeId
      );
    case "recovery":
      return flow.user_id === proof.userId;
    case "totp":
      return flow.state === "totp" && flow.user_id === proof.userId;
    default:
      return proof satisfies never;
  }
}

async function consumeVerifiedProof(
  repos: AuthLoginContext["repos"],
  proof: VerifiedPendingLoginProof,
  occurredAt: Date,
): Promise<Result<void, CompletePendingLoginError>> {
  switch (proof.method) {
    case "passkey": {
      if (!(await repos.webauthnChallenges.consume(proof.challengeId))) {
        return Err({ kind: "invalid_credentials" });
      }
      const updated = await repos.passkeys.updateCounter(
        proof.credential.credentialId,
        proof.credential.previousCounter,
        proof.credential.newCounter,
        occurredAt,
      );
      return updated
        ? Ok(undefined)
        : Err({ kind: "invalid_credentials" } as const);
    }
    case "recovery": {
      const consumed = await repos.userRecoveryCodes.consumeActiveCode(
        proof.userId,
        proof.codeHash,
        occurredAt,
      );
      return consumed
        ? Ok(undefined)
        : Err({ kind: "invalid_recovery" } as const);
    }
    case "totp": {
      const factor = await repos.userTotpFactors.findByUserId(proof.userId);
      return factor?.is_enabled &&
        factor.secret_encrypted === proof.secretEncrypted
        ? Ok(undefined)
        : Err({ kind: "flow_expired" } as const);
    }
    default:
      return proof satisfies never;
  }
}

async function recordSuccessfulProof(
  repos: AuthLoginContext["repos"],
  proof: VerifiedPendingLoginProof,
  ipAddress: string,
  occurredAt: Date,
): Promise<void> {
  const throttle = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });
  const identifier =
    proof.method === "passkey" ? proof.identifier : `user:${proof.userId}`;

  switch (proof.method) {
    case "passkey":
      await throttle.clearPasskeyVerifyFailureState(identifier, ipAddress);
      break;
    case "recovery":
      await throttle.clearRecoveryVerifyFailureState(identifier, ipAddress);
      break;
    case "totp":
      await throttle.clearTotpVerifyFailureState(identifier, ipAddress);
      break;
    default:
      proof satisfies never;
  }

  await recordAuthEvent(repos, {
    userId: proof.userId,
    identifier,
    ipAddress,
    method: proof.method,
    stage: proof.method === "recovery" ? "recovery" : "verify",
    outcome: "success",
    occurredAt,
  });
}

export async function completePendingLogin(
  deps: AuthLoginContext,
  input: SessionRequestMetadata & {
    proof: VerifiedPendingLoginProof;
  },
  operation: OperationContext,
): Promise<Result<LoginFlowLoginResult, CompletePendingLoginError>> {
  const completed = await deps.uow.run<
    LoginFlowLoginResult,
    CompletePendingLoginError
  >(async (repos) => {
    const flow = await repos.loginFlows.findByIdForUpdate(input.proof.flowId);
    if (
      !flow ||
      flow.expires_at < operation.operationAt ||
      !flowMatchesProof(flow, input.proof)
    ) {
      return Err({ kind: "flow_expired" });
    }

    const user = await repos.users.findByIdForUpdate(input.proof.userId);
    const context = user
      ? await loadActiveAuthContextForUser(user, repos, operation)
      : null;
    if (!context) {
      return Err({ kind: "flow_expired" });
    }

    const consumed = await consumeVerifiedProof(
      repos,
      input.proof,
      operation.operationAt,
    );
    if (isErr(consumed)) {
      return consumed;
    }

    await enqueueAlertOnNewLoginSource({
      user: context.user,
      ipAddress: input.ipAddress,
      method: `${flow.primary_auth_method}+${input.proof.method}`,
      occurredAt: operation.operationAt,
      deps: repos,
    });
    await recordSuccessfulProof(
      repos,
      input.proof,
      input.ipAddress,
      operation.operationAt,
    );

    const sessionClass = resolveSessionClass({
      onboardingCompleted: context.user.onboarding_completed_at !== null,
      recoveryCodesAcknowledgementRequired:
        context.recoveryCodesAcknowledgementRequired,
    });
    const session = await createAuditedSessionIssuer({
      sessions: repos.sessions,
      events: repos.events,
    }).establish(
      {
        user: context.user,
        sessionClass,
        request: {
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        primaryAuthMethod: flow.primary_auth_method,
        strongAuthMethod: input.proof.method,
        strongAuthAt: operation.operationAt,
        auditAction:
          flow.primary_auth_method === "passkey" ? "login_passkey" : "login",
      },
      operation,
    );
    // repos always carries a real events writer, so establish() cannot fail here.
    if (isErr(session)) {
      throw new Error(session.error.code ?? "session_establish_failed");
    }
    await repos.loginFlows.delete(flow.id);

    return Ok({
      userId: session.value.userId,
      role: session.value.role,
      sessionClass: session.value.sessionClass,
      token: session.value.token,
    });
  });

  if (
    !isErr(completed) ||
    completed.error.kind !== "invalid_recovery" ||
    input.proof.method !== "recovery"
  ) {
    return completed;
  }

  const identifier = `user:${input.proof.userId}`;
  await createAuthThrottleService({
    authThrottle: deps.repos.authThrottle,
  }).recordRecoveryVerifyFailure(
    identifier,
    input.ipAddress,
    operation.operationAt,
  );
  await recordAuthEvent(deps.repos, {
    userId: input.proof.userId,
    identifier,
    ipAddress: input.ipAddress,
    method: "recovery",
    stage: "recovery",
    outcome: "failure",
    reason: "invalid_token",
    occurredAt: operation.operationAt,
  });
  return completed;
}
