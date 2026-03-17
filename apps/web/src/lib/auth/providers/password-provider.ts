import { asUserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import { verifyPasswordLoginCredentials } from "../password/password-login";
import type { AuthProof } from "../policy/policy-types";

type PasswordProviderDeps = Pick<
  Repositories,
  "users" | "authThrottle" | "authEvents"
>;

export async function authenticatePassword(
  input: {
    identifier: string;
    password: string;
    ipAddress: string;
  },
  deps: PasswordProviderDeps,
): Promise<
  Result<
    Extract<AuthProof, { kind: "password" }>,
    { kind: "invalid_credentials" }
  >
> {
  const user = await verifyPasswordLoginCredentials(
    {
      username: input.identifier,
      password: input.password,
      ipAddress: input.ipAddress,
    },
    { repos: deps },
  );
  if (!user.ok) {
    return Err({ kind: "invalid_credentials" });
  }

  return Ok({
    kind: "password",
    userId: asUserId(user.value.id),
  });
}
