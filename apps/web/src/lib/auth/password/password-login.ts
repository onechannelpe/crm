import { assertNonEmptyString } from "~/lib/contracts/guards";
import type { User } from "~/lib/db/types";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { InvalidCredentialsError } from "../errors";
import { recordAuthEvent } from "../security/auth-events";
import { hashPassword, verifyPassword } from "./password";
import {
  checkLoginThrottle,
  clearLoginFailureState,
  recordLoginFailure,
} from "./throttle";

const DUMMY_HASH = hashPassword("dummy-constant-for-timing-parity");

type Deps = Pick<Repositories, "users" | "authThrottle" | "authEvents">;

export interface PasswordCredentialInput {
  username: string;
  password: string;
  ipAddress: string;
}

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
