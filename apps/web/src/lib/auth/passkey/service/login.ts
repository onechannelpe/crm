import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import type { PrimaryAuthMethod } from "~/lib/auth/core/session-contract";
import {
  checkPasskeyChallengeThrottle,
  checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState,
  recordPasskeyChallengeFailure,
  recordPasskeyVerifyFailure,
} from "~/lib/auth/password/throttle";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { config } from "~/lib/config";
import { Err, Ok, type Result } from "~/server/shared/result";

import { deleteLoginFlow } from "../../login-flow/shared";
import type {
  issueAppSession,
  issuePreAuthSession,
} from "../../session/session-issuer";
import { isPasskeyRequestError } from "../passkey";
import type { PasskeyAuthRepos } from "./shared";
import {
  normalizePasskeyFlowId,
  normalizePasskeyIdentifier,
  unexpectedPasskeyLoginError,
} from "./shared";
import type {
  BeginPasskeyLoginError,
  FinishPasskeyLoginError,
  PasskeyLoginFlowState,
  PasskeyLoginResult,
} from "./types";

interface PasskeyLoginServiceDeps {
  webauthnService: {
    getAuthenticationOptions(
      userId?: number,
    ): Promise<PasskeyLoginFlowState["requestOptions"]>;
    verifyAuthentication(
      response: AuthenticationResponseJSON,
      challenge: string,
    ): Promise<{ verified: boolean; userId: number }>;
  };
  issueAppSession: typeof issueAppSession;
  issuePreAuthSession: typeof issuePreAuthSession;
}

interface BeginPasskeyLoginInput {
  identifier: string;
  ipAddress: string;
  primaryAuthMethod?: PrimaryAuthMethod;
}

interface FinishPasskeyLoginInput {
  flowId: number;
  response: AuthenticationResponseJSON;
  ipAddress: string;
  userAgent: string | null;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}

export function createPasskeyLoginService(
  repos: PasskeyAuthRepos,
  deps: PasskeyLoginServiceDeps,
) {
  return {
    async beginLogin(
      input: BeginPasskeyLoginInput,
    ): Promise<Result<PasskeyLoginFlowState, BeginPasskeyLoginError>> {
      const identifier = normalizePasskeyIdentifier(input.identifier);
      if (typeof identifier !== "string") {
        return Err(identifier);
      }

      try {
        const throttle = await checkPasskeyChallengeThrottle(
          identifier,
          input.ipAddress,
          repos,
        );
        if (!throttle.allowed) {
          const blockedUser = await repos.users.findByUsername(identifier);
          await recordAuthEvent(repos, {
            userId: blockedUser?.id ?? null,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "challenge",
            outcome: "throttled",
            reason: "threshold_exceeded",
          });
          return Err({ kind: "invalid_credentials" });
        }

        const user = await repos.users.findByUsername(identifier);
        if (!user || !user.is_active) {
          await recordPasskeyChallengeFailure(
            identifier,
            input.ipAddress,
            repos,
          );
          await recordAuthEvent(repos, {
            userId: user?.id ?? null,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "challenge",
            outcome: "failure",
            reason: user ? "inactive_user" : "user_not_found",
          });
          return Err({ kind: "invalid_credentials" });
        }

        const options = await deps.webauthnService.getAuthenticationOptions(
          user.id,
        );
        const challengeId = await repos.webauthnChallenges.create({
          user_id: user.id,
          type: "authentication",
          challenge: options.challenge,
          expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
        });
        const flowId = await repos.loginFlows.create({
          identifier,
          primary_auth_method: input.primaryAuthMethod ?? "passkey",
          user_id: user.id,
          challenge_id: challengeId,
          state: "passkey",
          expires_at: Date.now() + config.auth.loginFlowTtlMs,
        });

        return Ok({
          id: flowId,
          identifier,
          state: "passkey",
          requestOptions: options,
        });
      } catch {
        return Err(unexpectedPasskeyLoginError());
      }
    },

    async finishLogin(
      input: FinishPasskeyLoginInput,
    ): Promise<Result<PasskeyLoginResult, FinishPasskeyLoginError>> {
      const safeFlowId = normalizePasskeyFlowId(input.flowId);
      if (typeof safeFlowId !== "number") {
        return Err(safeFlowId);
      }

      try {
        const flow = await repos.loginFlows.findById(safeFlowId);
        if (
          !flow ||
          flow.state !== "passkey" ||
          flow.expires_at < Date.now() ||
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
        const throttle = await checkPasskeyVerifyThrottle(
          identifier,
          input.ipAddress,
          repos,
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
          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
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
        if (challenge.expires_at < Date.now()) {
          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
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

        let verifiedUserId: number;
        try {
          const verification = await deps.webauthnService.verifyAuthentication(
            input.response,
            challenge.challenge,
          );
          verifiedUserId = verification.userId;
        } catch (error: unknown) {
          if (!isPasskeyRequestError(error)) {
            return Err(unexpectedPasskeyLoginError());
          }

          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
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
        const user = await repos.users.findById(verifiedUserId);
        if (!user || !user.is_active) {
          await recordPasskeyVerifyFailure(identifier, input.ipAddress, repos);
          await recordAuthEvent(repos, {
            userId: user?.id ?? verifiedUserId,
            identifier,
            ipAddress: input.ipAddress,
            method: "passkey",
            stage: "verify",
            outcome: "failure",
            reason: user ? "inactive_user" : "user_not_found",
          });
          return Err({ kind: "invalid_credentials" });
        }

        await sendAlertOnNewLoginSource({
          user,
          ipAddress: input.ipAddress,
          method: "passkey",
          deps: repos,
          sendPrivilegedLoginAlert: input.sendPrivilegedLoginAlert,
        });
        await clearPasskeyVerifyFailureState(
          identifier,
          input.ipAddress,
          repos,
        );
        await recordAuthEvent(repos, {
          userId: user.id,
          identifier,
          ipAddress: input.ipAddress,
          method: "passkey",
          stage: "verify",
          outcome: "success",
        });

        const session =
          user.onboarding_completed_at !== null
            ? await deps.issueAppSession({
                user,
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
                primaryAuthMethod: flow.primary_auth_method,
                strongAuthMethod: "passkey",
                strongAuthAt: Date.now(),
                auditAction: "login_passkey",
                deps: repos,
              })
            : await deps.issuePreAuthSession({
                user,
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
                primaryAuthMethod: flow.primary_auth_method,
                strongAuthMethod: "passkey",
                strongAuthAt: Date.now(),
                auditAction: "login_passkey",
                deps: repos,
              });

        return Ok(session);
      } catch {
        return Err(unexpectedPasskeyLoginError());
      }
    },
  };
}
