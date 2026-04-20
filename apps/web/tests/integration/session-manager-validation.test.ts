import { sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionCache } from "../../src/lib/auth/session/session-cache";
import {
  generateSessionToken,
  hashSessionToken,
} from "../../src/lib/auth/session/tokens";
import { asUserId, asBranchId } from "../../src/server/shared/ids";
import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";

describe("session manager validation", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("session-manager");
    sessionCache.clear();
  });

  afterEach(async () => {
    sessionCache.clear();
    await runtime.dispose();
  });

  it("deletes session when persisted role is invalid", async () => {
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    const now = Date.now();
    const sessionClass = "app" as const;
    const primaryAuthMethod = "password" as const;
    const strongAuthMethod = null;
    const strongAuthAt: number | null = null;
    const ipAddress: string | null = null;
    const userAgent: string | null = null;

    await sql`
      insert into user_sessions
      (id, user_id, branch_id, role, session_class, primary_auth_method, strong_auth_method, strong_auth_at, ip_address, user_agent, created_at, last_activity, expires_at)
      values (${sessionId}, ${asUserId("1")}, ${asBranchId("1")}, ${"invalid_role"}, ${sessionClass}, ${primaryAuthMethod}, ${strongAuthMethod}, ${strongAuthAt}, ${ipAddress}, ${userAgent}, ${now}, ${now}, ${now + 60_000})
    `.execute(runtime.ctx.db);

    const result =
      await runtime.auth.sessionService.validateSessionToken(token);
    expect(result.session).toBeNull();
    expect(await runtime.ctx.repos.sessions.findById(sessionId)).toBeNull();
  });

  it("returns cached session without reloading the user record", async () => {
    const token = await runtime.auth.sessionService.createSession({
      userId: asUserId("1"),
      branchId: asBranchId("1"),
      role: "executive",
      sessionClass: "app",
      ipAddress: null,
      userAgent: null,
      primaryAuthMethod: "password",
      strong_auth_method: null,
      strong_auth_at: null,
    } as any); // use as any if needed for compatibility with internal ServiceSessionOptions if it changed, but let's try correct shape first

    const first = await runtime.auth.sessionService.validateSessionToken(token);
    expect(first.session).not.toBeNull();

    const userFindSpy = vi.spyOn(runtime.ctx.repos.users, "findById");
    const second =
      await runtime.auth.sessionService.validateSessionToken(token);
    expect(second.session).not.toBeNull();
    expect(userFindSpy).not.toHaveBeenCalled();
  });

  it("removes cached sessions after explicit invalidation", async () => {
    const token = await runtime.auth.sessionService.createSession({
      userId: asUserId("1"),
      branchId: asBranchId("1"),
      role: "executive",
      sessionClass: "app",
      ipAddress: null,
      userAgent: null,
      primaryAuthMethod: "password",
      strong_auth_method: null,
      strong_auth_at: null,
    } as any);
    const sessionId = hashSessionToken(token);

    const first = await runtime.auth.sessionService.validateSessionToken(token);
    expect(first.session).not.toBeNull();

    await runtime.auth.sessionService.invalidateUserSessions(asUserId("1"));

    const second =
      await runtime.auth.sessionService.validateSessionToken(token);
    expect(second.session).toBeNull();
    expect(await runtime.ctx.repos.sessions.findById(sessionId)).toBeNull();
  });

  it("derives onboarding completion from session class without user lookup", async () => {
    const token = await runtime.auth.sessionService.createSession({
      userId: asUserId("1"),
      branchId: asBranchId("1"),
      role: "executive",
      sessionClass: "pre_auth",
      ipAddress: null,
      userAgent: null,
      primaryAuthMethod: "password",
      strong_auth_method: null,
      strong_auth_at: null,
    } as any);
    const result =
      await runtime.auth.sessionService.validateSessionToken(token);
    expect(result.session?.onboardingCompleted).toBe(false);
  });
});
