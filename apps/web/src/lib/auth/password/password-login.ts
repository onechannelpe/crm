import { assertNonEmptyString } from "~/lib/contracts/guards";
import type { User } from "~/lib/db/schema";
import { repos } from "~/server/shared/context";
import type { Repositories } from "~/server/shared/registry";

import type { Role } from "../access/rbac";
import { getPasswordLoginPolicy } from "../security/auth-contract";
import { recordAuthEvent } from "../security/auth-events";
import { sendAlertOnNewLoginSource } from "../security/login-source-alert";
import { resolvePasswordStrongAuth } from "../security/password-strong-auth";
import { type SendPrivilegedLoginAlert } from "../security/privileged-login-alert";
import { getStrongAuthStatus } from "../security/strong-auth-status";
import { issueLoginSession } from "../session/login-completion";
import { hashPassword, verifyPassword } from "./password";
import {
  checkLoginThrottle,
  clearLoginFailureState,
  recordLoginFailure,
} from "./throttle";

const INVALID_CREDENTIALS = "Invalid credentials";

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

interface PasswordLoginDeps {
  repos?: Deps;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}

export async function verifyPasswordLoginCredentials(
  input: PasswordCredentialInput,
  deps: { repos?: Deps },
): Promise<User> {
  const safeUsername = assertNonEmptyString(input.username, "username");
  const safePassword = assertNonEmptyString(input.password, "password");
  const resolvedDeps = deps.repos ?? repos;
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
    throw new Error(INVALID_CREDENTIALS);
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
    throw new Error(INVALID_CREDENTIALS);
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
    throw new Error(INVALID_CREDENTIALS);
  }

  await clearLoginFailureState(safeUsername, input.ipAddress, resolvedDeps);
  return user;
}

export async function getPasswordLoginNextStep(
  user: User,
  deps: Pick<Deps, "userTotpFactors" | "passkeys">,
): Promise<"complete" | "totp"> {
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
    return "complete";
  }

  if (passwordLoginPolicy === "password_or_totp" && strongAuthStatus.hasTotp) {
    return "totp";
  }

  throw new Error(
    strongAuthStatus.hasPasskey
      ? "Use a passkey or configure an authenticator app"
      : "Strong authentication required",
  );
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

export async function authenticatePasswordLogin(
  input: PasswordLoginInput,
  deps: PasswordLoginDeps,
): Promise<PasswordLoginResult> {
  const resolvedDeps = deps.repos ?? repos;
  const user = await verifyPasswordLoginCredentials(
    {
      username: input.username,
      password: input.password,
      ipAddress: input.ipAddress,
    },
    { repos: resolvedDeps },
  );
  const strongAuth = await resolvePasswordStrongAuth({
    user,
    ipAddress: input.ipAddress,
    totpCode: input.totpCode,
    deps: resolvedDeps,
  });

  return completePasswordLogin({
    user,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    authMethod: strongAuth.authMethod,
    strongAuthAt: strongAuth.strongAuthAt,
    deps: resolvedDeps,
    sendPrivilegedLoginAlert: deps.sendPrivilegedLoginAlert,
  });
}
