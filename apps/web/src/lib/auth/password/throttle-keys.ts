import { hashAuthKey } from "./key-hash";
import type { AuthThrottleEndpoint } from "./throttle-policy";

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function buildAccountThrottleKey(
  endpoint: AuthThrottleEndpoint,
  identifier: string,
): string {
  const normalized = normalizeIdentifier(identifier);
  return hashAuthKey(`account:${endpoint}:${normalized}`);
}

export function buildThrottleKeys(
  endpoint: AuthThrottleEndpoint,
  identifier: string,
  ip: string,
) {
  const normalized = normalizeIdentifier(identifier);
  const account = buildAccountThrottleKey(endpoint, normalized);
  const source = hashAuthKey(`ip:${endpoint}:${ip}`);
  const pair = hashAuthKey(`pair:${endpoint}:${ip}:${normalized}`);
  return { ip: source, account, ip_account: pair } as const;
}
