import type { Selectable } from "kysely";

import { assertNonEmptyString } from "~/lib/contracts/guards";
import type { UsersTable } from "~/lib/db/types";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { createUsersRepo } from "~/server/users/repos-users";

import type { InvalidCredentialsError } from "../errors";
import { recordAuthEvent } from "../security/auth-events";
import { hashPassword, verifyPassword } from "./password";

const DUMMY_HASH = hashPassword("dummy-constant-for-timing-parity");

type Deps = {
  users: ReturnType<typeof createUsersRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
};

type UserRow = Selectable<UsersTable>;

export interface PasswordCredentialInput {
  username: string;
  password: string;
  ipAddress: string;
}

export async function verifyPasswordLoginCredentials(
  input: PasswordCredentialInput,
  deps: { repos: Deps },
): Promise<Result<UserRow, InvalidCredentialsError>> {
  const safeUsername = assertNonEmptyString(input.username, "username");
  const safePassword = assertNonEmptyString(input.password, "password");
  const resolvedDeps = deps.repos;
  const throttleService = createAuthThrottleService({
    authThrottle: resolvedDeps.authThrottle,
  });
  const throttle = await throttleService.checkLoginThrottle(
    safeUsername,
    input.ipAddress,
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
    await throttleService.recordLoginFailure(safeUsername, input.ipAddress);
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
    await throttleService.recordLoginFailure(safeUsername, input.ipAddress);
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

  await throttleService.clearLoginFailureState(safeUsername, input.ipAddress);
  await recordAuthEvent(resolvedDeps, {
    userId: user.id,
    identifier: safeUsername,
    ipAddress: input.ipAddress,
    method: "password",
    stage: "login",
    outcome: "success",
  });
  return Ok(user);
}
