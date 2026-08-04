import type { InvalidCredentialsError } from "~/domain/auth/errors";
import type {
  PasskeyLoginFlowState,
  PasskeyLoginMode,
} from "~/domain/auth/passkey/types";
import type { UserId } from "~/domain/ids";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import {
  AUTH_LOGIN_FLOW_TTL_MS,
  AUTH_WEBAUTHN_CHALLENGE_TTL_MS,
} from "~/server/auth/config";
import type { AuthContextUser } from "~/server/auth/context/auth-context";
import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import { recordAuthEvent } from "~/server/auth/security/auth-events";
import { Err, Ok, type Result } from "~/shared/result";

import type { PasskeyAuthReadRepos } from "./shared";

const DISCOVERABLE_PASSKEY_IDENTIFIER = "discoverable";

type IdentifiedPasskeyUser = Pick<AuthContextUser, "id" | "is_active">;

type PreparePasskeyLoginInput =
  | {
      identifier: string;
      ipAddress: string;
      mode: "identified";
      primaryAuthMethod?: "password" | "google" | "passkey";
      occurredAt: Date;
      account:
        | { kind: "lookup" }
        | { kind: "authenticated"; user: IdentifiedPasskeyUser };
    }
  | {
      ipAddress: string;
      mode: "discoverable";
      primaryAuthMethod?: "passkey";
      occurredAt: Date;
    };

export type PreparedPasskeyLogin = {
  challengeUserId: UserId | null;
  flowUserId: UserId | null;
  identifier: string;
  mode: PasskeyLoginMode;
  options: PasskeyLoginFlowState["requestOptions"];
  primaryAuthMethod: "password" | "google" | "passkey";
  occurredAt: Date;
};

async function prepareDiscoverableLogin(
  repos: PasskeyAuthReadRepos,
  webauthnProvider: WebauthnProvider,
  input: Extract<PreparePasskeyLoginInput, { mode: "discoverable" }>,
): Promise<Result<PreparedPasskeyLogin, InvalidCredentialsError>> {
  const throttle = await createAuthThrottleService({
    authThrottle: repos.authThrottle,
  }).checkPasskeyChallengeThrottle(
    DISCOVERABLE_PASSKEY_IDENTIFIER,
    input.ipAddress,
    input.occurredAt,
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
      occurredAt: input.occurredAt,
    });
    return Err({ kind: "invalid_credentials" });
  }

  const options = await webauthnProvider.getAuthenticationOptions();
  return Ok({
    challengeUserId: null,
    flowUserId: null,
    identifier: DISCOVERABLE_PASSKEY_IDENTIFIER,
    mode: "discoverable",
    options,
    primaryAuthMethod: "passkey",
    occurredAt: input.occurredAt,
  });
}

async function prepareIdentifiedLogin(
  repos: PasskeyAuthReadRepos,
  webauthnProvider: WebauthnProvider,
  input: Extract<PreparePasskeyLoginInput, { mode: "identified" }>,
): Promise<Result<PreparedPasskeyLogin, InvalidCredentialsError>> {
  const identifier = input.identifier.trim();
  if (!identifier) return Err({ kind: "invalid_credentials" });

  const throttleService = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });
  const throttle = await throttleService.checkPasskeyChallengeThrottle(
    identifier,
    input.ipAddress,
    input.occurredAt,
  );
  const user =
    input.account.kind === "authenticated"
      ? input.account.user
      : await repos.users.findByUsername(identifier);

  if (!throttle.allowed) {
    await recordAuthEvent(repos, {
      userId: user?.id ?? null,
      identifier,
      ipAddress: input.ipAddress,
      method: "passkey",
      stage: "challenge",
      outcome: "throttled",
      reason: "threshold_exceeded",
      occurredAt: input.occurredAt,
    });
    return Err({ kind: "invalid_credentials" });
  }

  if (!user?.is_active) {
    await throttleService.recordPasskeyChallengeFailure(
      identifier,
      input.ipAddress,
      input.occurredAt,
    );
    await recordAuthEvent(repos, {
      userId: user?.id ?? null,
      identifier,
      ipAddress: input.ipAddress,
      method: "passkey",
      stage: "challenge",
      outcome: "failure",
      reason: user ? "inactive_user" : "user_not_found",
      occurredAt: input.occurredAt,
    });
    return Err({ kind: "invalid_credentials" });
  }

  const options = await webauthnProvider.getAuthenticationOptions(user.id);
  return Ok({
    challengeUserId: user.id,
    flowUserId: user.id,
    identifier,
    mode: "identified",
    options,
    primaryAuthMethod: input.primaryAuthMethod ?? "passkey",
    occurredAt: input.occurredAt,
  });
}

export function preparePasskeyLogin(
  repos: PasskeyAuthReadRepos,
  webauthnProvider: WebauthnProvider,
  input: PreparePasskeyLoginInput,
): Promise<Result<PreparedPasskeyLogin, InvalidCredentialsError>> {
  return input.mode === "discoverable"
    ? prepareDiscoverableLogin(repos, webauthnProvider, input)
    : prepareIdentifiedLogin(repos, webauthnProvider, input);
}

export async function persistPasskeyLoginFlow(
  repos: PasskeyAuthReadRepos,
  prepared: PreparedPasskeyLogin,
): Promise<PasskeyLoginFlowState> {
  const challengeId = await repos.webauthnChallenges.create({
    user_id: prepared.challengeUserId,
    type: "authentication",
    challenge: prepared.options.challenge,
    expires_at: new Date(
      prepared.occurredAt.getTime() + AUTH_WEBAUTHN_CHALLENGE_TTL_MS,
    ),
    created_at: prepared.occurredAt,
  });
  const flowId = await repos.loginFlows.create({
    identifier: prepared.identifier,
    primary_auth_method: prepared.primaryAuthMethod,
    user_id: prepared.flowUserId,
    challenge_id: challengeId,
    state: "passkey",
    expires_at: new Date(
      prepared.occurredAt.getTime() + AUTH_LOGIN_FLOW_TTL_MS,
    ),
    created_at: prepared.occurredAt,
  });

  if (prepared.mode === "identified") {
    return {
      id: flowId,
      identifier: prepared.identifier,
      mode: "identified",
      state: "passkey",
      requestOptions: prepared.options,
    };
  }

  return {
    id: flowId,
    mode: "discoverable",
    state: "passkey",
    requestOptions: prepared.options,
  };
}
