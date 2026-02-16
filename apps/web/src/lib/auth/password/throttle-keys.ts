import { hashAuthKey } from "./key-hash";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildThrottleKeys(email: string, ip: string) {
  const normalizedEmail = normalizeEmail(email);
  const account = hashAuthKey(`account:${normalizedEmail}`);
  const source = hashAuthKey(`ip:${ip}`);
  const pair = hashAuthKey(`pair:${ip}:${normalizedEmail}`);
  return { ip: source, account, ip_account: pair } as const;
}
