import { assertNonEmptyString } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";
import type { Repositories } from "~/server/shared/registry";

import type { Role } from "../access/rbac";
import { recordAuthEvent } from "../security/auth-events";
import { sendAlertOnNewLoginSource } from "../security/login-source-alert";
import { resolvePasswordStrongAuth } from "../security/password-strong-auth";
import { type SendPrivilegedLoginAlert } from "../security/privileged-login-alert";
import { createSession } from "../session/session-manager";
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
>;

export interface PasswordLoginInput {
  username: string;
  password: string;
  totpCode?: string;
  ipAddress: string;
  userAgent: string | null;
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

export async function authenticatePasswordLogin(
  input: PasswordLoginInput,
  deps: PasswordLoginDeps,
): Promise<PasswordLoginResult> {
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
  const strongAuth = await resolvePasswordStrongAuth({
    user,
    ipAddress: input.ipAddress,
    totpCode: input.totpCode,
    deps: resolvedDeps,
  });

  await sendAlertOnNewLoginSource({
    user,
    ipAddress: input.ipAddress,
    method: strongAuth.authMethod,
    deps: resolvedDeps,
    sendPrivilegedLoginAlert: deps.sendPrivilegedLoginAlert,
  });

  const token = await createSession(
    user.id,
    user.branch_id,
    user.role,
    input.ipAddress,
    input.userAgent,
    strongAuth.authMethod,
    strongAuth.strongAuthAt,
    resolvedDeps,
  );

  await resolvedDeps.auditLogs.create({
    user_id: user.id,
    action: "login",
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: Date.now(),
  });
  await recordAuthEvent(resolvedDeps, {
    userId: user.id,
    identifier: safeUsername,
    ipAddress: input.ipAddress,
    method: "password",
    stage: "login",
    outcome: "success",
    reason: strongAuth.authMethod === "password_totp" ? "totp_verified" : null,
  });

  return {
    userId: user.id,
    role: user.role,
    onboardingCompleted: user.onboarding_completed_at !== null,
    token,
  };
}
