import type { BranchId, UserId } from "~/server/shared/ids";

import type { Role } from "../access/rbac";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "../core/session-contract";

interface CachedSession {
  userId: UserId;
  branchId: BranchId;
  role: Role;
  onboardingCompleted: boolean;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: Date | null;
  impersonatorUserId: UserId | null;
  expiresAt: Date;
  cachedUntil: number;
}

class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly cacheTTL = 5 * 60 * 1000;

  get(sessionId: string): CachedSession | null {
    const cached = this.cache.get(sessionId);
    if (!cached) return null;

    const now = Date.now();

    if (cached.cachedUntil < now) {
      this.cache.delete(sessionId);
      return null;
    }

    if (cached.expiresAt.getTime() < now) {
      this.cache.delete(sessionId);
      return null;
    }

    return cached;
  }

  set(sessionId: string, session: Omit<CachedSession, "cachedUntil">): void {
    this.cache.set(sessionId, {
      ...session,
      cachedUntil: Date.now() + this.cacheTTL,
    });
  }

  delete(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  deleteByUserId(userId: UserId): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.userId === userId) {
        this.cache.delete(key);
      }
    }
  }

  deleteByUserIdExcept(userId: UserId, retainedSessionId: string): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.userId === userId && key !== retainedSessionId) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.cachedUntil < now || value.expiresAt.getTime() < now) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }

  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const value of this.cache.values()) {
      if (value.cachedUntil < now || value.expiresAt.getTime() < now) {
        expired++;
      } else {
        valid++;
      }
    }

    return { total: this.cache.size, valid, expired };
  }
}

export const sessionCache = new SessionCache();

if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(
    () => sessionCache.cleanup(),
    10 * 60 * 1000,
  );
  cleanupTimer.unref?.();
}
