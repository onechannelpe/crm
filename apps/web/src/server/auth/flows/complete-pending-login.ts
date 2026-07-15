import { loadActiveAuthContextForUser } from "~/lib/auth/context/auth-context";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { enqueueAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { LoginFlowLoginResult } from "~/server/auth/application/contracts";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { VerifiedPasskeyLogin } from "~/server/auth/factors/passkey/service/login-finish";
import type { AuthLoginContext } from "~/server/auth/infrastructure/login-context";
import type { SessionRequestMetadata } from "~/server/auth/session/session-spec";
import { createSessionService } from "~/server/auth/session/session.service";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

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
    now: () => occurredAt,
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
    occurredAt: Date;
  },
): Promise<Result<LoginFlowLoginResult, CompletePendingLoginError>> {
  const completed = await deps.uow.run<
    LoginFlowLoginResult,
    CompletePendingLoginError
  >(async (repos) => {
    const flow = await repos.loginFlows.findByIdForUpdate(input.proof.flowId);
    if (
      !flow ||
      flow.expires_at < input.occurredAt ||
      !flowMatchesProof(flow, input.proof)
    ) {
      return Err({ kind: "flow_expired" });
    }

    const user = await repos.users.findByIdForUpdate(input.proof.userId);
    const context = user
      ? await loadActiveAuthContextForUser(user, repos, input.occurredAt)
      : null;
    if (!context) return Err({ kind: "flow_expired" });

    const consumed = await consumeVerifiedProof(
      repos,
      input.proof,
      input.occurredAt,
    );
    if (isErr(consumed)) return consumed;

    await enqueueAlertOnNewLoginSource({
      user: context.user,
      ipAddress: input.ipAddress,
      method: `${flow.primary_auth_method}+${input.proof.method}`,
      occurredAt: input.occurredAt,
      deps: repos,
    });
    await recordSuccessfulProof(
      repos,
      input.proof,
      input.ipAddress,
      input.occurredAt,
    );

    const session = await createSessionService({
      ...repos,
      now: () => input.occurredAt,
    }).establish({
      user: context.user,
      sessionClass: context.user.onboarding_completed_at ? "app" : "pre_auth",
      request: {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      primaryAuthMethod: flow.primary_auth_method,
      strongAuthMethod: input.proof.method,
      strongAuthAt: input.occurredAt,
      auditAction:
        flow.primary_auth_method === "passkey" ? "login_passkey" : "login",
    });
    await repos.loginFlows.delete(flow.id);

    return Ok({
      userId: session.userId,
      role: session.role,
      onboardingCompleted: session.onboardingCompleted,
      token: session.token,
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
    now: () => input.occurredAt,
  }).recordRecoveryVerifyFailure(identifier, input.ipAddress);
  await recordAuthEvent(deps.repos, {
    userId: input.proof.userId,
    identifier,
    ipAddress: input.ipAddress,
    method: "recovery",
    stage: "recovery",
    outcome: "failure",
    reason: "invalid_token",
    occurredAt: input.occurredAt,
  });
  return completed;
}
