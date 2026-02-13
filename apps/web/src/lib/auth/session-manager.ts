import { generateSessionToken, hashSessionToken, isValidTokenFormat } from "./tokens";
import { sessionCache } from "./session-cache";
import { repos } from "~/server/shared/context";
import type { NewUserSession } from "~/lib/db/schema";

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000;
const EXTENSION_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

export interface SessionValidationResult {
    session: {
        id: string;
        userId: number;
        branchId: number;
        role: string;
    } | null;
}

export async function createSession(
    userId: number,
    branchId: number,
    role: string,
    ipAddress: string | null,
    userAgent: string | null
): Promise<string> {
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    const now = Date.now();

    const newSession: NewUserSession = {
        id: sessionId,
        user_id: userId,
        branch_id: branchId,
        role,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: now,
        last_activity: now,
        expires_at: now + SESSION_DURATION,
    };

    await repos.sessions.create(newSession);

    return token;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
    if (!isValidTokenFormat(token)) {
        return { session: null };
    }

    const sessionId = hashSessionToken(token);
    const now = Date.now();

    const cached = sessionCache.get(sessionId);
    if (cached) {
        return {
            session: {
                id: sessionId,
                userId: cached.userId,
                branchId: cached.branchId,
                role: cached.role,
            },
        };
    }

    const dbSession = await repos.sessions.findById(sessionId);

    if (!dbSession) {
        return { session: null };
    }

    if (dbSession.expires_at < now) {
        await repos.sessions.delete(sessionId);
        return { session: null };
    }

    if (now - dbSession.last_activity > ACTIVITY_UPDATE_THRESHOLD) {
        repos.sessions.updateActivity(sessionId, now).catch(console.error);
    }

    if (dbSession.expires_at - now < EXTENSION_THRESHOLD) {
        const newExpiry = now + SESSION_DURATION;
        repos.sessions.extendExpiry(sessionId, newExpiry).catch(console.error);
        dbSession.expires_at = newExpiry;
    }

    sessionCache.set(sessionId, {
        userId: dbSession.user_id,
        branchId: dbSession.branch_id,
        role: dbSession.role,
        expiresAt: dbSession.expires_at,
    });

    return {
        session: {
            id: sessionId,
            userId: dbSession.user_id,
            branchId: dbSession.branch_id,
            role: dbSession.role,
        },
    };
}

export async function invalidateSession(sessionId: string): Promise<void> {
    await repos.sessions.delete(sessionId);
    sessionCache.delete(sessionId);
}

export async function invalidateUserSessions(userId: number): Promise<void> {
    await repos.sessions.deleteAllForUser(userId);
    sessionCache.deleteByUserId(userId);
}
