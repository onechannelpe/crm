import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { User } from "~/lib/db/types";
import { longName } from "~/lib/users/display-name";
import type { Repositories } from "~/server/shared/registry";

import type { SendPrivilegedLoginAlert } from "./privileged-login-alert";

type Deps = Pick<Repositories, "authEvents">;

const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;

export async function sendAlertOnNewLoginSource(params: {
  user: User;
  ipAddress: string;
  method: string;
  deps: Deps;
  sendPrivilegedLoginAlert: SendPrivilegedLoginAlert;
}): Promise<void> {
  const ipHash = hashAuthKey(`ip:${params.ipAddress}`);
  const knownIp = await params.deps.authEvents.hasRecentSuccessFromIp(
    params.user.id,
    ipHash,
    Date.now() - LOOKBACK_MS,
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
    occurredAt: Date.now(),
  });
}
