import type { Selectable } from "kysely";

import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { UsersTable } from "~/lib/db/types";
import { longName } from "~/lib/users/display-name";
import type { createAuthEventsRepo } from "~/server/auth/repos-auth-events";

import type { SendPrivilegedLoginAlert } from "./privileged-login-alert";

type Deps = {
  authEvents: ReturnType<typeof createAuthEventsRepo>;
};

const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;

type UserRow = Selectable<UsersTable>;

export async function sendAlertOnNewLoginSource(params: {
  user: Pick<
    UserRow,
    "id" | "email" | "names" | "first_surname" | "second_surname" | "role"
  >;
  ipAddress: string;
  method: string;
  deps: Deps;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}): Promise<void> {
  const ipHash = hashAuthKey(`ip:${params.ipAddress}`);
  const knownIp = await params.deps.authEvents.hasRecentSuccessFromIp(
    params.user.id,
    ipHash,
    new Date(Date.now() - LOOKBACK_MS),
  );
  if (knownIp) {
    return;
  }

  await params.sendPrivilegedLoginAlert({
    userId: params.user.id,
    email: params.user.email,
    fullName: longName(params.user),
    role: params.user.role,
    ipAddress: params.ipAddress,
    method: params.method,
    occurredAt: new Date(),
  });
}
