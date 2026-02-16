import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import {
  createSession,
  validateSessionToken,
} from "../../src/lib/auth/session/session-manager";
import { sessionCache } from "../../src/lib/auth/session/session-cache";
import {
  generateSessionToken,
  hashSessionToken,
} from "../../src/lib/auth/session/tokens";
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

    await sql`
      insert into user_sessions
      (id, user_id, branch_id, role, ip_address, user_agent, created_at, last_activity, expires_at)
      values (${sessionId}, ${1}, ${1}, ${"invalid_role"}, ${null}, ${null}, ${now}, ${now}, ${now + 60_000})
    `.execute(ctx.db);

    const result = await validateSessionToken(token, ctx.repos);
    expect(result.session).toBeNull();
    expect(await ctx.repos.sessions.findById(sessionId)).toBeNull();
  });

  it("invalidates cached session immediately after user deactivation", async () => {
    const token = await createSession(1, 1, "executive", null, null, ctx.repos);
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
    const token = await createSession(1, 1, "executive", null, null, ctx.repos);
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
    const token = await createSession(1, 1, "executive", null, null, ctx.repos);
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
