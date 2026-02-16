import type { Repositories } from "~/server/shared/registry";

import { assertNonEmptyString } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

import type { Role } from "../access/rbac";

import { recordAuthEvent } from "../security/auth-events";
import { createSession } from "../session/session-manager";
import { verifyPassword } from "./password";
import {
  checkLoginThrottle,
  clearLoginFailureState,
  recordLoginFailure,
} from "./throttle";

const INVALID_CREDENTIALS = "Invalid credentials";

type Deps = Pick<
  Repositories,
  "users" | "sessions" | "auditLogs" | "authThrottle" | "authEvents"
>;

export interface PasswordLoginInput {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string | null;
}

export interface PasswordLoginResult {
  userId: number;
  role: Role;
  token: string;
}

export async function authenticatePasswordLogin(
  input: PasswordLoginInput,
  deps?: Deps,
): Promise<PasswordLoginResult> {
  const safeEmail = assertNonEmptyString(input.email, "email");
  const safePassword = assertNonEmptyString(input.password, "password");
  const resolvedDeps = deps ?? repos;
  const throttle = await checkLoginThrottle(
    safeEmail,
    input.ipAddress,
    resolvedDeps,
  );

  if (!throttle.allowed) {
    const blockedUser = await resolvedDeps.users.findByEmail(safeEmail);
    await recordAuthEvent(resolvedDeps, {
      userId: blockedUser?.id ?? null,
      identifier: safeEmail,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "throttled",
      reason: "threshold_exceeded",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  const user = await resolvedDeps.users.findByEmail(safeEmail);

  if (!user || !user.is_active) {
    await recordLoginFailure(safeEmail, input.ipAddress, resolvedDeps);
    await recordAuthEvent(resolvedDeps, {
      userId: user?.id ?? null,
      identifier: safeEmail,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "failure",
      reason: user ? "inactive_user" : "user_not_found",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  if (!(await verifyPassword(user.password_hash, safePassword))) {
    await recordLoginFailure(safeEmail, input.ipAddress, resolvedDeps);
    await recordAuthEvent(resolvedDeps, {
      userId: user.id,
      identifier: safeEmail,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "failure",
      reason: "invalid_password",
    });
    throw new Error(INVALID_CREDENTIALS);
  }

  await clearLoginFailureState(safeEmail, input.ipAddress, resolvedDeps);

  const token = await createSession(
    user.id,
    user.branch_id,
    user.role,
    input.ipAddress,
    input.userAgent,
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
    identifier: safeEmail,
    ipAddress: input.ipAddress,
    method: "password",
    stage: "login",
    outcome: "success",
  });

  return { userId: user.id, role: user.role, token };
}
