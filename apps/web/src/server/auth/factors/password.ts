import type { Selectable } from "kysely";

import { verifyPasswordLoginCredentials } from "~/lib/auth/password/password-login";
import type { UsersTable } from "~/lib/db/types";
import type { AuthProof } from "~/server/auth/policy/types";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import type { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { createUsersRepo } from "~/server/users/repos-users";

type PasswordProviderDeps = {
  users: ReturnType<typeof createUsersRepo>;
  authThrottle: ReturnType<typeof createAuthThrottleRepo>;
  authEvents: ReturnType<typeof createAuthEventsRepo>;
  now: () => Date;
};

interface AuthenticatedPassword {
  proof: Extract<AuthProof, { kind: "password" }>;
  user: Selectable<UsersTable>;
}

export async function authenticatePassword(
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
  },
  deps: PasswordProviderDeps,
): Promise<Result<AuthenticatedPassword, { kind: "invalid_credentials" }>> {
  const user = await verifyPasswordLoginCredentials(
    {
      username: input.identifier,
      password: input.password,
      ipAddress: input.ipAddress,
    },
    { repos: deps, now: deps.now },
  );
  if (!user.ok) {
    return Err({ kind: "invalid_credentials" });
  }

  return Ok({
    proof: {
      kind: "password",
      userId: user.value.id,
    },
    user: user.value,
  });
}
