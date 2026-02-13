import { config } from "~/lib/config";

export function isLockExpired(expiresAt: number, now: number = Date.now()): boolean {
    return now >= expiresAt;
}

export function computeLockExpiry(now: number = Date.now()): number {
    return now + config.inventoryLock.expiryMinutes * 60 * 1000;
}
