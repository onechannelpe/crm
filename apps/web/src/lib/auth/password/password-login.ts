import { assertNonEmptyString } from "~/lib/contracts/guards";
import type { User } from "~/lib/db/types";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { Role } from "../access/rbac";
import type {
  InvalidCredentialsError,
  PasskeyRequiredError,
  StrongAuthRequiredError,
} from "../errors";
import { getPasswordLoginPolicy } from "../security/auth-contract";
import { recordAuthEvent } from "../security/auth-events";
import { sendAlertOnNewLoginSource } from "../security/login-source-alert";
import { type SendPrivilegedLoginAlert } from "../security/privileged-login-alert";
import { getStrongAuthStatus } from "../security/strong-auth-status";
import { issueLoginSession } from "../session/login-completion";
import { hashPassword, verifyPassword } from "./password";
import {
  checkLoginThrottle,
  clearLoginFailureState,
  recordLoginFailure,
} from "./throttle";

const DUMMY_HASH = hashPassword("dummy-constant-for-timing-parity");

type Deps = Pick<
  Repositories,
  | "users"
  | "sessions"
  | "auditLogs"
  | "authThrottle"
  | "authEvents"
  | "userTotpFactors"
  | "userTotpRecoveryCodes"
  | "passkeys"
>;

export interface PasswordLoginInput {
  username: string;
  password: string;
  totpCode?: string;
  ipAddress: string;
  userAgent: string | null;
}

export interface PasswordCredentialInput {
  username: string;
  password: string;
  ipAddress: string;
}

export interface PasswordLoginResult {
  userId: number;
  role: Role;
  onboardingCompleted: boolean;
  token: string;
}

export type PasswordLoginNextStepError =
  | StrongAuthRequiredError
  | PasskeyRequiredError;

export type PasswordLoginError =
  | InvalidCredentialsError
  | PasswordLoginNextStepError;

export async function verifyPasswordLoginCredentials(
  input: PasswordCredentialInput,
  deps: { repos: Deps },
): Promise<Result<User, InvalidCredentialsError>> {
  const safeUsername = assertNonEmptyString(input.username, "username");
  const safePassword = assertNonEmptyString(input.password, "password");
  const resolvedDeps = deps.repos;
  const throttle = await checkLoginThrottle(
    safeUsername,
    input.ipAddress,
    resolvedDeps,
  );

  if (!throttle.allowed) {
    const blockedUser = await resolvedDeps.users.findByUsername(safeUsername);
    await recordAuthEvent(resolvedDeps, {
      userId: blockedUser?.id ?? null,
      identifier: safeUsername,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "throttled",
      reason: "threshold_exceeded",
    });
    return Err({ kind: "invalid_credentials" });
  }

  const user = await resolvedDeps.users.findByUsername(safeUsername);

  if (!user || !user.is_active) {
    await verifyPassword(await DUMMY_HASH, safePassword);
    await recordLoginFailure(safeUsername, input.ipAddress, resolvedDeps);
    await recordAuthEvent(resolvedDeps, {
      userId: user?.id ?? null,
      identifier: safeUsername,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "failure",
      reason: user ? "inactive_user" : "user_not_found",
    });
    return Err({ kind: "invalid_credentials" });
  }

  if (!(await verifyPassword(user.password_hash, safePassword))) {
    await recordLoginFailure(safeUsername, input.ipAddress, resolvedDeps);
    await recordAuthEvent(resolvedDeps, {
      userId: user.id,
      identifier: safeUsername,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "failure",
      reason: "invalid_password",
    });
    return Err({ kind: "invalid_credentials" });
  }

  await clearLoginFailureState(safeUsername, input.ipAddress, resolvedDeps);
  return Ok(user);
}

export async function getPasswordLoginNextStep(
  user: User,
  deps: Pick<Deps, "userTotpFactors" | "passkeys">,
): Promise<Result<"complete" | "totp", PasswordLoginNextStepError>> {
  const strongAuthStatus = await getStrongAuthStatus(user.id, deps);
  const passwordLoginPolicy = getPasswordLoginPolicy({
    role: user.role,
    onboardingCompleted: user.onboarding_completed_at !== null,
    strongAuthStatus,
  });

  if (
    passwordLoginPolicy === "password_only" ||
    passwordLoginPolicy === "password_bootstrap"
  ) {
    return Ok("complete");
  }

  if (passwordLoginPolicy === "password_or_totp" && strongAuthStatus.hasTotp) {
    return Ok("totp");
  }

  return Err({
    kind: strongAuthStatus.hasPasskey
      ? "passkey_required"
      : "strong_auth_required",
  });
}

export async function completePasswordLogin(params: {
  user: User;
  ipAddress: string;
  userAgent: string | null;
  authMethod: "password" | "password_totp";
  strongAuthAt: number | null;
  deps: Deps;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}): Promise<PasswordLoginResult> {
  const { user, ipAddress, userAgent, authMethod, strongAuthAt } = params;

  await sendAlertOnNewLoginSource({
    user,
    ipAddress,
    method: authMethod,
    deps: params.deps,
    sendPrivilegedLoginAlert: params.sendPrivilegedLoginAlert,
  });

  const session = await issueLoginSession({
    user,
    ipAddress,
    userAgent,
    authMethod,
    strongAuthAt,
    auditAction: "login",
    deps: params.deps,
  });
  await recordAuthEvent(params.deps, {
    userId: user.id,
    identifier: user.username,
    ipAddress,
    method: "password",
    stage: "login",
    outcome: "success",
    reason: authMethod === "password_totp" ? "totp_verified" : null,
  });

  return {
    userId: session.userId,
    role: session.role,
    onboardingCompleted: session.onboardingCompleted,
    token: session.token,
  };
}
