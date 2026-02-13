"use server";

import { repos } from "~/server/shared/context";
import { verifyPassword } from "~/lib/auth/password";
import { createSession, invalidateSession, validateSessionToken } from "~/lib/auth/session-manager";
import { getSessionCookie, setSessionCookie, deleteSessionCookie } from "~/lib/auth/cookies";
import { hashSessionToken } from "~/lib/auth/tokens";

export async function login(email: string, password: string) {
    const user = await repos.users.findByEmail(email);
    if (!user) throw new Error("Invalid credentials");
    if (!user.is_active) throw new Error("Account disabled");

    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) throw new Error("Invalid credentials");

    const oldToken = getSessionCookie();
    if (oldToken) {
        const oldSessionId = hashSessionToken(oldToken);
        await invalidateSession(oldSessionId).catch(() => {});
    }

    const token = await createSession(
        user.id,
        user.branch_id,
        user.role,
        null,
        null
    );

    setSessionCookie(token);

    await repos.auditLogs.create({
        user_id: user.id,
        action: "login",
        entity_type: "user",
        entity_id: user.id,
        changes: null,
        created_at: Date.now(),
    });

    return { userId: user.id, role: user.role };
}

export async function logout() {
    const token = getSessionCookie();
    if (!token) return;

    const sessionId = hashSessionToken(token);

    const { session } = await validateSessionToken(token);

    await invalidateSession(sessionId);
    deleteSessionCookie();

    if (session) {
        await repos.auditLogs.create({
            user_id: session.userId,
            action: "logout",
            entity_type: "user",
            entity_id: session.userId,
            changes: null,
            created_at: Date.now(),
        });
    }
}

export async function getMe() {
    const token = getSessionCookie();
    if (!token) return null;

    const { session } = await validateSessionToken(token);
    if (!session) return null;

    const user = await repos.users.findById(session.userId);
    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        branchId: user.branch_id,
    };
}
