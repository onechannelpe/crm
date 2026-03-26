import { sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { sessionCache } from "../../src/lib/auth/session/session-cache";
import {
  createSession,
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

  it("invalidates cached session immediately after user deactivation", async () => {
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

    await ctx.db
      .updateTable("users")
      .set({ is_active: 0 })
      .where("id", "=", 1)
      .execute();

    const second = await validateSessionToken(token, ctx.repos);
    expect(second.session).toBeNull();
    expect(await ctx.repos.sessions.findById(sessionId)).toBeNull();
  });

  it("invalidates cached session when user role changes", async () => {
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

    await ctx.db
      .updateTable("users")
      .set({ role: "supervisor" })
      .where("id", "=", 1)
      .execute();

    const second = await validateSessionToken(token, ctx.repos);
    expect(second.session).toBeNull();
    expect(await ctx.repos.sessions.findById(sessionId)).toBeNull();
  });

  it("invalidates cached session when user branch changes", async () => {
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

    await ctx.db
      .updateTable("users")
      .set({ branch_id: 2 })
      .where("id", "=", 1)
      .execute();

    const second = await validateSessionToken(token, ctx.repos);
    expect(second.session).toBeNull();
    expect(await ctx.repos.sessions.findById(sessionId)).toBeNull();
  });
});
