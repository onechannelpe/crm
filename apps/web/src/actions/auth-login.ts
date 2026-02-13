"use server";

import { getSessionCookie, setSessionCookie } from "~/lib/auth/cookies";
import { verifyPassword } from "~/lib/auth/password";
import { createSession, invalidateSession } from "~/lib/auth/session-manager";
import { hashSessionToken } from "~/lib/auth/tokens";
import { repos } from "~/server/shared/context";

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

    const token = await createSession(user.id, user.branch_id, user.role, null, null);
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
