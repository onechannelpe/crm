import { createAuthScenario } from "@tests/support/auth/scenario";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("session repository lifecycle", () => {
  const scenario = createAuthScenario("session-repo");
  const user = "execOne" as const;

  beforeEach(async () => {
    await scenario.setup();
  });

  afterEach(async () => {
    await scenario.teardown();
  });

  it("creates, reads, updates, extends, and deletes session", async () => {
    const now = Date.now();
    const sessionId = `s-${now}`;
    const identity = scenario.identity(user);

    await scenario.ctx.repos.sessions.create({
      id: sessionId,
      user_id: identity.userId,
      branch_id: identity.branchId,
      role: identity.role,
      session_class: "app",
      primary_auth_method: "password",
      strong_auth_method: null,
      strong_auth_at: null,
      ip_address: "127.0.0.1",
      user_agent: "vitest",
      created_at: now,
      last_activity: now,
      expires_at: now + 60_000,
    });

    const loaded = await scenario.ctx.repos.sessions.findById(sessionId);
    expect(loaded?.id).toBe(sessionId);

    await scenario.ctx.repos.sessions.updateActivity(sessionId, now + 5000);
    await scenario.ctx.repos.sessions.extendExpiry(sessionId, now + 120_000);

    const updated = await scenario.ctx.repos.sessions.findById(sessionId);
    expect(updated?.last_activity).toBe(now + 5000);
    expect(updated?.expires_at).toBe(now + 120_000);

    await scenario.ctx.repos.sessions.delete(sessionId);
    const missing = await scenario.ctx.repos.sessions.findById(sessionId);
    expect(missing).toBeNull();
  });

  it("deletes expired sessions and counts active sessions", async () => {
    const now = Date.now();
    const identity = scenario.identity(user);
    await scenario.ctx.repos.sessions.create({
      id: "active-1",
      user_id: identity.userId,
      branch_id: identity.branchId,
      role: identity.role,
      session_class: "app",
      primary_auth_method: "password",
      strong_auth_method: null,
      strong_auth_at: null,
      ip_address: null,
      user_agent: null,
      created_at: now,
      last_activity: now,
      expires_at: now + 60_000,
    });
    await scenario.ctx.repos.sessions.create({
      id: "expired-1",
      user_id: identity.userId,
      branch_id: identity.branchId,
      role: identity.role,
      session_class: "app",
      primary_auth_method: "password",
      strong_auth_method: null,
      strong_auth_at: null,
      ip_address: null,
      user_agent: null,
      created_at: now,
      last_activity: now,
      expires_at: now - 1,
    });

    const countBefore = await scenario.ctx.repos.sessions.countActive();
    expect(countBefore).toBe(1);

    const deleted = await scenario.ctx.repos.sessions.deleteExpired();
    expect(deleted).toBeGreaterThanOrEqual(1);

    const expired = await scenario.ctx.repos.sessions.findById("expired-1");
    const active = await scenario.ctx.repos.sessions.findById("active-1");
    expect(expired).toBeNull();
    expect(active).not.toBeNull();
  });

  it("bulk deletes sessions for user", async () => {
    const now = Date.now();
    const identity = scenario.identity(user);
    await scenario.ctx.db
      .insertInto("user_sessions")
      .values(
        Array.from({ length: 200 }, (_, i) => ({
          id: `bulk-${i}`,
          user_id: identity.userId,
          branch_id: identity.branchId,
          role: identity.role,
          session_class: "app" as const,
          primary_auth_method: "password" as const,
          strong_auth_method: null,
          strong_auth_at: null,
          ip_address: null,
          user_agent: null,
          created_at: now,
          last_activity: now,
          expires_at: now + 60_000,
        })),
      )
      .execute();

    await scenario.ctx.repos.sessions.deleteAllForUser(identity.userId);

    const remaining = await scenario.ctx.repos.sessions.listForUser(
      identity.userId,
    );
    expect(remaining).toHaveLength(0);
  });
});
