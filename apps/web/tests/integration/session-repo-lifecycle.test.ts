import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "../support/test-db";

describe("session repository lifecycle", () => {
    let ctx: TestDbContext;

    beforeEach(async () => {
        ctx = await createIsolatedTestDb("session-repo");
    });

    afterEach(async () => {
        await cleanupTestDb(ctx);
    });

    it("creates, reads, updates, extends, and deletes session", async () => {
        const now = Date.now();
        const sessionId = `s_${Math.random().toString(36).slice(2)}`;

        await ctx.repos.sessions.create({
            id: sessionId,
            user_id: 1,
            branch_id: 1,
            role: "executive",
            ip_address: "127.0.0.1",
            user_agent: "vitest",
            created_at: now,
            last_activity: now,
            expires_at: now + 60_000,
        });

        const loaded = await ctx.repos.sessions.findById(sessionId);
        expect(loaded?.id).toBe(sessionId);

        await ctx.repos.sessions.updateActivity(sessionId, now + 5000);
        await ctx.repos.sessions.extendExpiry(sessionId, now + 120_000);

        const updated = await ctx.repos.sessions.findById(sessionId);
        expect(updated?.last_activity).toBe(now + 5000);
        expect(updated?.expires_at).toBe(now + 120_000);

        await ctx.repos.sessions.delete(sessionId);
        const missing = await ctx.repos.sessions.findById(sessionId);
        expect(missing).toBeNull();
    });

    it("deletes expired sessions and counts active sessions", async () => {
        const now = Date.now();
        await ctx.repos.sessions.create({
            id: "active-1",
            user_id: 1,
            branch_id: 1,
            role: "executive",
            ip_address: null,
            user_agent: null,
            created_at: now,
            last_activity: now,
            expires_at: now + 60_000,
        });
        await ctx.repos.sessions.create({
            id: "expired-1",
            user_id: 1,
            branch_id: 1,
            role: "executive",
            ip_address: null,
            user_agent: null,
            created_at: now,
            last_activity: now,
            expires_at: now - 1,
        });

        const countBefore = await ctx.repos.sessions.countActive();
        expect(countBefore).toBe(1);

        const deleted = await ctx.repos.sessions.deleteExpired();
        expect(deleted).toBeGreaterThanOrEqual(1);

        const expired = await ctx.repos.sessions.findById("expired-1");
        const active = await ctx.repos.sessions.findById("active-1");
        expect(expired).toBeNull();
        expect(active).not.toBeNull();
    });

    it("bulk deletes sessions for user", async () => {
        const now = Date.now();
        for (let i = 0; i < 200; i++) {
            await ctx.repos.sessions.create({
                id: `bulk-${i}`,
                user_id: 1,
                branch_id: 1,
                role: "executive",
                ip_address: null,
                user_agent: null,
                created_at: now,
                last_activity: now,
                expires_at: now + 60_000,
            });
        }

        await ctx.repos.sessions.deleteAllForUser(1);

        const remaining = await ctx.repos.sessions.listForUser(1);
        expect(remaining).toHaveLength(0);
    });

});
