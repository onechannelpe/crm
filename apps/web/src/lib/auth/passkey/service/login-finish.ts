import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { loadActiveAuthContext } from "~/lib/auth/context/auth-context";
import {
  checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState,
  recordPasskeyVerifyFailure,
} from "~/lib/auth/password/throttle";
import { evaluateLoginPolicy } from "~/lib/auth/policy/login-policy";
import {
  isPasskeyRequestError,
  PasskeyRequestError,
} from "~/lib/auth/providers/passkey-provider";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { sendAlertOnNewLoginSource } from "~/lib/auth/security/login-source-alert";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { Err, Ok, type Result } from "~/server/shared/result";

import { deleteLoginFlow } from "../../login-flow/shared";
import type { issueLoginSession } from "../../session/session-transition";
import type { PasskeyAuthRepos } from "./shared";
import { normalizePasskeyFlowId, unexpectedPasskeyLoginError } from "./shared";
import type { FinishPasskeyLoginError, PasskeyLoginResult } from "./types";

interface PasskeyLoginFinishServiceDeps {
  webauthnProvider: {
    verifyAuthentication(
      response: AuthenticationResponseJSON,
      challenge: string,
    ): Promise<{ verified: boolean; userId: number }>;
  };
  issueLoginSession: typeof issueLoginSession;
}

interface FinishPasskeyLoginInput {
  flowId: number;
  response: AuthenticationResponseJSON;
  ipAddress: string;
  userAgent: string | null;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}

export function createPasskeyLoginFinishService(
  repos: PasskeyAuthRepos,
  deps: PasskeyLoginFinishServiceDeps,
) {
  return {
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
          const verification = await deps.webauthnProvider.verifyAuthentication(
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
        const context = await loadActiveAuthContext(verifiedUserId, repos);
        if (!context) {
          return Err({ kind: "invalid_credentials" });
        }

        const decision = evaluateLoginPolicy({
          proof: {
            kind: "passkey",
            userId: context.user.id,
          },
          context,
        });
        if (decision.kind !== "issue_session") {
          return Err({ kind: "invalid_credentials" });
        }

        await clearPasskeyVerifyFailureState(
          identifier,
          input.ipAddress,
          repos,
        );
        await sendAlertOnNewLoginSource({
          user: context.user,
          ipAddress: input.ipAddress,
          method: "passkey",
          deps: repos,
          sendPrivilegedLoginAlert: input.sendPrivilegedLoginAlert,
        });

        return Ok(
          await deps.issueLoginSession({
            user: context.user,
            decision,
            request: {
              ipAddress: input.ipAddress,
              userAgent: input.userAgent,
            },
            primaryAuthMethod: "passkey",
            auditAction: "login_passkey",
            deps: repos,
          }),
        );
      } catch {
        return Err(unexpectedPasskeyLoginError());
      }
    },
  };
}
