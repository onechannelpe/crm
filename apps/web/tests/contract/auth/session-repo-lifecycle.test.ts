import { createAuthScenario } from "@tests/support/auth/scenario";
import { seedBulkSessions } from "@tests/support/auth/sessions";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("session repository lifecycle", () => {
  const scenario = createAuthScenario("session-repo");
  const user = "execOne" as const;

  beforeAll(async () => {
    await scenario.setup();
  });

  afterAll(async () => {
    await scenario.teardown();
  });

  beforeEach(async () => {
    await scenario.reset();
  });

  it("creates, reads, updates, extends, and deletes session", async () => {
    const now = new Date();
    const activityAt = new Date(now.getTime() + 5_000);
    const expiresAt = new Date(now.getTime() + 60_000);
    const extendedExpiresAt = new Date(now.getTime() + 120_000);
    const sessionId = `s-${now.getTime()}`;
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
      expires_at: expiresAt,
    });

    const loaded = await scenario.ctx.repos.sessions.findById(sessionId);
    expect(loaded?.id).toBe(sessionId);

    await scenario.ctx.repos.sessions.updateActivity(sessionId, activityAt);
    await scenario.ctx.repos.sessions.extendExpiry(
      sessionId,
      extendedExpiresAt,
    );

    const updated = await scenario.ctx.repos.sessions.findById(sessionId);
    expect(updated?.last_activity).toEqual(activityAt);
    expect(updated?.expires_at).toEqual(extendedExpiresAt);

    await scenario.ctx.repos.sessions.delete(sessionId);
    const missing = await scenario.ctx.repos.sessions.findById(sessionId);
    expect(missing).toBeNull();
  });

  it("deletes expired sessions and counts active sessions", async () => {
    const now = new Date();
    const activeExpiresAt = new Date(now.getTime() + 60_000);
    const expiredAt = new Date(now.getTime() - 1);
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
      expires_at: activeExpiresAt,
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
      expires_at: expiredAt,
    });

    const countBefore = await scenario.ctx.repos.sessions.countActive();
    expect(countBefore).toBe(1);

    const deleted = await scenario.ctx.repos.sessions.deleteExpired();
    expect(deleted).toBe(1);

    const expired = await scenario.ctx.repos.sessions.findById("expired-1");
    const active = await scenario.ctx.repos.sessions.findById("active-1");
    expect(expired).toBeNull();
    expect(active).not.toBeNull();
  });

  it("bulk deletes sessions for user", async () => {
    const identity = scenario.identity(user);
    await seedBulkSessions(scenario.ctx, user, 200);

    await scenario.ctx.repos.sessions.deleteAllForUser(identity.userId);

    const remaining = await scenario.ctx.repos.sessions.listForUser(
      identity.userId,
    );
    expect(remaining).toHaveLength(0);
  });
});
