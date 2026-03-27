import { sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionCache } from "../../src/lib/auth/session/session-cache";
import {
  createSession,
  invalidateUserSessions,
  validateSessionToken,
} from "../../src/lib/auth/session/session-manager";
import {
  generateSessionToken,
  hashSessionToken,
} from "../../src/lib/auth/session/tokens";
import { asBranchId, asUserId } from "../../src/server/shared/ids";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("session manager validation", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("session-manager");
    sessionCache.clear();
  });

  afterEach(async () => {
    sessionCache.clear();
    await cleanupTestDb(ctx);
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
      values (${sessionId}, ${1}, ${1}, ${"invalid_role"}, ${sessionClass}, ${primaryAuthMethod}, ${strongAuthMethod}, ${strongAuthAt}, ${ipAddress}, ${userAgent}, ${now}, ${now}, ${now + 60_000})
    `.execute(ctx.db);

    const result = await validateSessionToken(token, ctx.repos);
    expect(result.session).toBeNull();
    expect(await ctx.repos.sessions.findById(sessionId)).toBeNull();
  });

  it("returns cached session without reloading the user record", async () => {
    const token = await createSession(
      {
        userId: asUserId(1),
        branchId: asBranchId(1),
        role: "executive",
        sessionClass: "app",
        ipAddress: null,
        userAgent: null,
        primaryAuthMethod: "password",
        strongAuthMethod: null,
        strongAuthAt: null,
      },
      ctx.repos,
    );

    const first = await validateSessionToken(token, ctx.repos);
    expect(first.session).not.toBeNull();

    const userFindSpy = vi.spyOn(ctx.repos.users, "findById");
    const second = await validateSessionToken(token, ctx.repos);
    expect(second.session).not.toBeNull();
    expect(userFindSpy).not.toHaveBeenCalled();
  });

  it("removes cached sessions after explicit invalidation", async () => {
    const token = await createSession(
      {
        userId: asUserId(1),
        branchId: asBranchId(1),
        role: "executive",
        sessionClass: "app",
        ipAddress: null,
        userAgent: null,
        primaryAuthMethod: "password",
        strongAuthMethod: null,
        strongAuthAt: null,
      },
      ctx.repos,
    );
    const sessionId = hashSessionToken(token);

    const first = await validateSessionToken(token, ctx.repos);
    expect(first.session).not.toBeNull();

    await invalidateUserSessions(asUserId(1), ctx.repos);

    const second = await validateSessionToken(token, ctx.repos);
    expect(second.session).toBeNull();
    expect(await ctx.repos.sessions.findById(sessionId)).toBeNull();
  });

  it("derives onboarding completion from session class without user lookup", async () => {
    const token = await createSession(
      {
        userId: asUserId(1),
        branchId: asBranchId(1),
        role: "executive",
        sessionClass: "pre_auth",
        ipAddress: null,
        userAgent: null,
        primaryAuthMethod: "password",
        strongAuthMethod: null,
        strongAuthAt: null,
      },
      ctx.repos,
    );
    const result = await validateSessionToken(token, ctx.repos);
    expect(result.session?.onboardingCompleted).toBe(false);
  });
});
