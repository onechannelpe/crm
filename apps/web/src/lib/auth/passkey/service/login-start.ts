import { createAuthThrottleService } from "~/server/features/auth/application/throttle-service";
import { recordAuthEvent } from "~/lib/auth/security/auth-events";
import { config } from "~/lib/config";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { PasskeyAuthRepos } from "./shared";
import {
  normalizePasskeyIdentifier,
  unexpectedPasskeyLoginError,
} from "./shared";
import type {
  BeginPasskeyLoginError,
  PasskeyLoginFlowState,
  PasskeyLoginMode,
} from "./types";

const DISCOVERABLE_PASSKEY_IDENTIFIER = "discoverable";

interface PasskeyLoginStartServiceDeps {
  webauthnProvider: {
    getAuthenticationOptions(input: {
      userId?: number;
      userVerification: "preferred" | "required";
    }): Promise<PasskeyLoginFlowState["requestOptions"]>;
  };
}

export type BeginPasskeyLoginInput =
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

export function createPasskeyLoginStartService(
  repos: PasskeyAuthRepos,
  deps: PasskeyLoginStartServiceDeps,
) {
  const throttleService = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });

  async function createAuthenticationFlow(input: {
    challengeUserId: number | null;
    flowUserId: number | null;
    identifier: string;
    mode: PasskeyLoginMode;
    primaryAuthMethod: "password" | "google" | "passkey";
    userVerification: "preferred" | "required";
  }): Promise<PasskeyLoginFlowState> {
    const options = await deps.webauthnProvider.getAuthenticationOptions({
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
          const throttle = await throttleService.checkPasskeyChallengeThrottle(
            DISCOVERABLE_PASSKEY_IDENTIFIER,
            input.ipAddress,
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

        const throttle = await throttleService.checkPasskeyChallengeThrottle(
          identifier,
          input.ipAddress,
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
          await throttleService.recordPasskeyChallengeFailure(
            identifier,
            input.ipAddress,
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
  };
}
