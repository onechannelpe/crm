interface CachedSession {
    userId: number;
    branchId: number;
    role: string;
    expiresAt: number;
    cachedUntil: number;
}

/**
 * In-memory cache for session data.
 * Reduces database queries by caching valid sessions with 5-minute TTL.
 * Cache invalidation happens on logout or session updates.
 */
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

        if (cached.expiresAt < now) {
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

    deleteByUserId(userId: number): void {
        for (const [key, value] of this.cache.entries()) {
            if (value.userId === userId) {
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
            if (value.cachedUntil < now || value.expiresAt < now) {
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
            if (value.cachedUntil < now || value.expiresAt < now) {
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
    setInterval(() => sessionCache.cleanup(), 10 * 60 * 1000);
}
