import type { Selectable } from "kysely";

import type { InvalidCredentialsError } from "~/domain/auth/errors";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import type { UsersTable } from "~/server/platform/database/types";
import type { OperationContext } from "~/server/platform/operation/context";
import type { createUsersRepo } from "~/server/users/repos-users";
import { Err, Ok, type Result } from "~/shared/result";

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
  repos: Deps,
  operation: OperationContext,
): Promise<Result<UserRow, InvalidCredentialsError>> {
  const username = input.username.trim();
  const occurredAt = operation.operationAt;

  if (!username || !input.password) {
    return Err({ kind: "invalid_credentials" });
  }

  const throttleService = createAuthThrottleService({
    authThrottle: repos.authThrottle,
  });

  const throttle = await throttleService.checkLoginThrottle(
    username,
    input.ipAddress,
    occurredAt,
  );

  if (!throttle.allowed) {
    // Resolve the account so throttled attempts remain attributable per user.
    const user = await repos.users.findByUsername(username);

    await recordAuthEvent(repos, {
      userId: user?.id ?? null,
      identifier: username,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "throttled",
      reason: "threshold_exceeded",
      occurredAt,
    });

    return Err({ kind: "invalid_credentials" });
  }

  const user = await repos.users.findByUsername(username);

  if (!user || !user.is_active) {
    await verifyPassword(await DUMMY_HASH, input.password);

    await throttleService.recordLoginFailure(
      username,
      input.ipAddress,
      occurredAt,
    );

    await recordAuthEvent(repos, {
      userId: user?.id ?? null,
      identifier: username,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "failure",
      reason: user ? "inactive_user" : "user_not_found",
      occurredAt,
    });

    return Err({ kind: "invalid_credentials" });
  }

  const passwordMatches = await verifyPassword(
    user.password_hash,
    input.password,
  );

  if (!passwordMatches) {
    await throttleService.recordLoginFailure(
      username,
      input.ipAddress,
      occurredAt,
    );

    await recordAuthEvent(repos, {
      userId: user.id,
      identifier: username,
      ipAddress: input.ipAddress,
      method: "password",
      stage: "login",
      outcome: "failure",
      reason: "invalid_password",
      occurredAt,
    });

    return Err({ kind: "invalid_credentials" });
  }

  return Ok(user);
}
