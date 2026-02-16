import type { AuthThrottleEndpoint } from "./throttle-policy";

import { hashAuthKey } from "./key-hash";

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export function buildThrottleKeys(
  endpoint: AuthThrottleEndpoint,
  identifier: string,
  ip: string,
) {
  const normalized = normalizeIdentifier(identifier);
  const account = hashAuthKey(`account:${endpoint}:${normalized}`);
  const source = hashAuthKey(`ip:${endpoint}:${ip}`);
  const pair = hashAuthKey(`pair:${endpoint}:${ip}:${normalized}`);
  return { ip: source, account, ip_account: pair } as const;
}
