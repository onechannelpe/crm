import { repos } from "~/server/shared/context";
import { sessionCache } from "./session-cache";

export async function cleanupExpiredSessions(): Promise<void> {
    const deleted = await repos.sessions.deleteExpired();
    if (deleted > 0) {
        console.log(`[Session Cleanup] Deleted ${deleted} expired sessions`);
    }
}

export function getCacheStats() {
    return sessionCache.getStats();
}

if (typeof setInterval !== "undefined") {
    setInterval(() => {
        cleanupExpiredSessions().catch(console.error);
    }, 60 * 60 * 1000);

    console.log("[Session Cleanup] Scheduled to run every hour");
}
