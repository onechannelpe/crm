import type { Role } from "~/domain/auth/access/rbac";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/domain/auth/core/session-contract";
import type { BranchId, UserId } from "~/domain/ids";

interface CachedSession {
  userId: UserId;
  branchId: BranchId;
  role: Role;
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

  // Entries expire lazily on read, so the caller's instant is enough and the
  // cache never needs a clock of its own.
  get(sessionId: string, readAt: Date): CachedSession | null {
    const cached = this.cache.get(sessionId);
    if (!cached) return null;

    const at = readAt.getTime();

    if (cached.cachedUntil < at) {
      this.cache.delete(sessionId);
      return null;
    }

    if (cached.expiresAt.getTime() < at) {
      this.cache.delete(sessionId);
      return null;
    }

    return cached;
  }

  set(
    sessionId: string,
    session: Omit<CachedSession, "cachedUntil">,
    cachedAt: Date,
  ): void {
    this.cache.set(sessionId, {
      ...session,
      cachedUntil: cachedAt.getTime() + this.cacheTTL,
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
}

export const sessionCache = new SessionCache();
