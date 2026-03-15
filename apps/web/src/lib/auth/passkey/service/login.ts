import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import {
  checkPasskeyChallengeThrottle,
  checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState,
  recordPasskeyChallengeFailure,
  recordPasskeyVerifyFailure,
} from "~/lib/auth/password/throttle";
import { evaluateLoginPolicy } from "~/lib/auth/policy/login-policy";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { config } from "~/lib/config";
import { Err, Ok, type Result } from "~/server/shared/result";

import { deleteLoginFlow } from "../../login-flow/shared";
import type { issueLoginSession } from "../../session/session-transition";
import { isPasskeyRequestError, PasskeyRequestError } from "../passkey";
import type { PasskeyAuthRepos } from "./shared";
import {
  normalizePasskeyFlowId,
  normalizePasskeyIdentifier,
  unexpectedPasskeyLoginError,
} from "./shared";
import type {
  BeginPasskeyLoginError,
  PasskeyLoginMode,
  FinishPasskeyLoginError,
  PasskeyLoginFlowState,
  PasskeyLoginResult,
} from "./types";

const DISCOVERABLE_PASSKEY_IDENTIFIER = "discoverable";

interface PasskeyLoginServiceDeps {
  webauthnService: {
    getAuthenticationOptions(input: {
      userId?: number;
      userVerification: "preferred" | "required";
    }): Promise<PasskeyLoginFlowState["requestOptions"]>;
    verifyAuthentication(
      response: AuthenticationResponseJSON,
      challenge: string,
    ): Promise<{ verified: boolean; userId: number }>;
  };
  issueLoginSession: typeof issueLoginSession;
}

type BeginPasskeyLoginInput =
  | {
      identifier: string;
      ipAddress: string;
      mode: "identified";
      primaryAuthMethod?: "password" | "google" | "passkey";
    }
  | {
      ipAddress: string;
      mode: "discoverable";
      primaryAuthMethod?: "passkey";
    };

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
  async function createAuthenticationFlow(input: {
    challengeUserId: number | null;
    flowUserId: number | null;
    identifier: string;
    mode: PasskeyLoginMode;
    primaryAuthMethod: "password" | "google" | "passkey";
    userVerification: "preferred" | "required";
  }): Promise<PasskeyLoginFlowState> {
    const options = await deps.webauthnService.getAuthenticationOptions({
      userId: input.challengeUserId ?? undefined,
      userVerification: input.userVerification,
    });
    const challengeId = await repos.webauthnChallenges.create({
      user_id: input.challengeUserId,
      type: "authentication",
      challenge: options.challenge,
      expires_at: Date.now() + config.auth.webauthnChallengeTtlMs,
    });
    const flowId = await repos.loginFlows.create({
      identifier: input.identifier,
      primary_auth_method: input.primaryAuthMethod,
      user_id: input.flowUserId,
      challenge_id: challengeId,
      state: "passkey",
      expires_at: Date.now() + config.auth.loginFlowTtlMs,
    });

    if (input.mode === "identified") {
      return {
        id: flowId,
        identifier: input.identifier,
        mode: "identified",
        state: "passkey",
        requestOptions: options,
      };
    }

    return {
      id: flowId,
      mode: "discoverable",
      state: "passkey",
      requestOptions: options,
    };
  }

  return {
    async beginLogin(
      input: BeginPasskeyLoginInput,
    ): Promise<Result<PasskeyLoginFlowState, BeginPasskeyLoginError>> {
      try {
        if (input.mode === "discoverable") {
          const throttle = await checkPasskeyChallengeThrottle(
            DISCOVERABLE_PASSKEY_IDENTIFIER,
            input.ipAddress,
            repos,
          );
          if (!throttle.allowed) {
            await recordAuthEvent(repos, {
              userId: null,
              identifier: DISCOVERABLE_PASSKEY_IDENTIFIER,
              ipAddress: input.ipAddress,
              method: "passkey",
              stage: "challenge",
              outcome: "throttled",
              reason: "threshold_exceeded",
            });
            return Err({ kind: "invalid_credentials" });
          }

          return Ok(
            await createAuthenticationFlow({
              challengeUserId: null,
              flowUserId: null,
              identifier: DISCOVERABLE_PASSKEY_IDENTIFIER,
              mode: "discoverable",
              primaryAuthMethod: "passkey",
              userVerification: "required",
            }),
          );
        }

        const identifier = normalizePasskeyIdentifier(input.identifier);
        if (typeof identifier !== "string") {
          return Err(identifier);
        }

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

        return Ok(
          await createAuthenticationFlow({
            challengeUserId: user.id,
            flowUserId: user.id,
            identifier,
            mode: "identified",
            primaryAuthMethod: input.primaryAuthMethod ?? "passkey",
            userVerification: "preferred",
          }),
        );
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
          if (challenge.user_id && verification.userId !== challenge.user_id) {
            throw new PasskeyRequestError("Credential user mismatch");
          }
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

        const context = await loadActiveAuthContext(user.id, repos);
        if (!context) {
          return Err({ kind: "invalid_credentials" });
        }
        const decision = evaluateLoginPolicy({
          proof: {
            kind: "passkey",
            userId: user.id,
          },
          context,
        });
        if (decision.kind !== "issue_session") {
          return Err(unexpectedPasskeyLoginError());
        }

        const session = await deps.issueLoginSession({
          user,
          decision,
          request: {
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
          },
          primaryAuthMethod: flow.primary_auth_method,
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
