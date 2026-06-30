import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import type { InvalidCredentialsError } from "~/lib/auth/errors";
import { deleteLoginFlow } from "~/lib/auth/login-flow/shared";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import {
  isPasskeyRequestError,
  PasskeyRequestError,
} from "~/server/auth/factors/passkey-provider";
import { evaluateLoginPolicy } from "~/server/auth/policy/engine";
import type {
  IssuedSession,
  SessionSpec,
} from "~/server/auth/session/session-spec";
import type { AuthLoginFlowId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { PasskeyAuthRepos } from "./shared";

type FinishPasskeyLoginError =
  | { kind: "flow_expired" }
  | InvalidCredentialsError;

interface PasskeyLoginFinishServiceDeps {
  webauthnProvider: {
    verifyAuthentication(
      response: AuthenticationResponseJSON,
      challenge: string,
    ): Promise<{ verified: boolean; userId: UserId }>;
  };
  establishSession: (spec: SessionSpec) => Promise<IssuedSession>;
}

interface FinishPasskeyLoginInput {
  flowId: AuthLoginFlowId;
  response: AuthenticationResponseJSON;
  ipAddress: string;
  userAgent: string | null;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}

export function createPasskeyLoginFinishService(
  repos: PasskeyAuthRepos,
  deps: PasskeyLoginFinishServiceDeps,
) {
  const throttleService = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });

  return {
    async finishLogin(
      input: FinishPasskeyLoginInput,
    ): Promise<Result<IssuedSession, FinishPasskeyLoginError>> {
      const flow = await repos.loginFlows.findById(input.flowId);
      if (
        !flow ||
        flow.state !== "passkey" ||
        flow.expires_at < new Date() ||
        !flow.challenge_id
      ) {
        await deleteLoginFlow(flow, repos);
        return Err({ kind: "flow_expired" });
      }

      const challenge = await repos.webauthnChallenges.findById(
        flow.challenge_id,
      );
      const identifier = challenge?.user_id
        ? `user:${challenge.user_id}`
        : `challenge:${flow.challenge_id}`;
      const throttle = await throttleService.checkPasskeyVerifyThrottle(
        identifier,
        input.ipAddress,
      );
      if (!throttle.allowed) {
        await recordAuthEvent(repos, {
          userId: challenge?.user_id ?? null,
          identifier,
          ipAddress: input.ipAddress,
          method: "passkey",
          stage: "verify",
          outcome: "throttled",
          reason: "threshold_exceeded",
        });
        return Err({ kind: "invalid_credentials" });
      }
      if (!challenge || challenge.type !== "authentication") {
        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );
        await recordAuthEvent(repos, {
          userId: null,
          identifier,
          ipAddress: input.ipAddress,
          method: "passkey",
          stage: "verify",
          outcome: "failure",
          reason: "invalid_challenge",
        });
        await repos.loginFlows.delete(flow.id);
        return Err({ kind: "invalid_credentials" });
      }

      await repos.webauthnChallenges.delete(challenge.id);
      if (challenge.expires_at < new Date()) {
        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );
        await recordAuthEvent(repos, {
          userId: challenge.user_id,
          identifier,
          ipAddress: input.ipAddress,
          method: "passkey",
          stage: "verify",
          outcome: "failure",
          reason: "challenge_expired",
        });
        await repos.loginFlows.delete(flow.id);
        return Err({ kind: "invalid_credentials" });
      }

      let verifiedUserId: UserId;
      try {
        const verification = await deps.webauthnProvider.verifyAuthentication(
          input.response,
          challenge.challenge,
        );

        verifiedUserId = verification.userId;
        if (challenge.user_id && verification.userId !== challenge.user_id) {
          throw new PasskeyRequestError("Credential user mismatch");
        }
      } catch (error: unknown) {
        // A rejected assertion is an expected failure; anything else is a fault
        // and propagates to the action boundary, which folds it to `internal`.
        if (!isPasskeyRequestError(error)) {
          throw error;
        }

        await throttleService.recordPasskeyVerifyFailure(
          identifier,
          input.ipAddress,
        );
        await recordAuthEvent(repos, {
          userId: challenge.user_id,
          identifier,
          ipAddress: input.ipAddress,
          method: "passkey",
          stage: "verify",
          outcome: "failure",
          reason: "assertion_invalid",
        });
        await repos.loginFlows.delete(flow.id);
        return Err({ kind: "invalid_credentials" });
      }

      await repos.loginFlows.delete(flow.id);
      const context = await loadActiveAuthContext(verifiedUserId, repos);
      if (!context) {
        return Err({ kind: "invalid_credentials" });
      }

      const decision = evaluateLoginPolicy({
        proof: {
          kind: "passkey",
          userId: verifiedUserId,
        },
        context,
      });
      if (decision.kind !== "issue_session") {
        return Err({ kind: "invalid_credentials" });
      }

      await throttleService.clearPasskeyVerifyFailureState(
        identifier,
        input.ipAddress,
      );
      await sendAlertOnNewLoginSource({
        user: context.user,
        ipAddress: input.ipAddress,
        method: "passkey",
        deps: repos,
        sendPrivilegedLoginAlert: input.sendPrivilegedLoginAlert,
      });

      return Ok(
        await deps.establishSession({
          user: context.user,
          sessionClass: decision.sessionClass,
          request: {
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          },
          primaryAuthMethod: "passkey",
          strongAuthMethod: decision.strongAuthMethod,
          strongAuthAt: decision.strongAuthAt,
          auditAction: "login_passkey",
        }),
      );
    },
  };
}
