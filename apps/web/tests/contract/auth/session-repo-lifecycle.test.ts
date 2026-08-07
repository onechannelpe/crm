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
    const sessions = scenario.ctx.repos.sessions;
    const identity = scenario.identity(user);

    const now = new Date("2026-01-01T00:00:00Z");
    const activityAt = new Date("2026-01-01T00:00:05Z");
    const expiresAt = new Date("2026-01-01T00:01:00Z");
    const extendedExpiresAt = new Date("2026-01-01T00:02:00Z");
    const sessionId = "session-lifecycle";

    await sessions.create({
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

    const loaded = await sessions.findById(sessionId);
    expect(loaded?.id).toBe(sessionId);

    await sessions.updateActivity(sessionId, activityAt);
    await sessions.extendExpiry(sessionId, extendedExpiresAt);

    const updated = await sessions.findById(sessionId);
    expect(updated?.last_activity).toEqual(activityAt);
    expect(updated?.expires_at).toEqual(extendedExpiresAt);

    await sessions.delete(sessionId);

    const missing = await sessions.findById(sessionId);
    expect(missing).toBeNull();
  });

  it("deletes expired sessions and counts active sessions", async () => {
    const sessions = scenario.ctx.repos.sessions;
    const identity = scenario.identity(user);

    const now = new Date("2026-01-01T00:00:00Z");
    const activeExpiresAt = new Date("2026-01-01T00:01:00Z");
    const expiredAt = new Date("2025-12-31T23:59:59Z");

    await sessions.create({
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

    await sessions.create({
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

    expect(await sessions.countActive(now)).toBe(1);

    expect(await sessions.deleteExpired(now)).toBe(1);

    expect(await sessions.findById("expired-1")).toBeNull();
    expect(await sessions.findById("active-1")).not.toBeNull();
  });

  it("bulk deletes sessions for user", async () => {
    const sessions = scenario.ctx.repos.sessions;
    const identity = scenario.identity(user);

    await seedBulkSessions(scenario.ctx, user, 200);
    await sessions.deleteAllForUser(identity.userId);

    const remaining = await sessions.listForUser(identity.userId);
    expect(remaining).toHaveLength(0);
  });
});
