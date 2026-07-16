import { getSeededIdentity } from "@tests/support/identities/api";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { sql } from "kysely";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { sessionCache } from "~/lib/auth/session/session-cache";
import {
  generateSessionToken,
  hashSessionToken,
} from "~/lib/auth/session/tokens";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createSessionService } from "~/server/auth/session/session.service";
import { createEventsRepo } from "~/server/shared/repos-events";

const IDENTITY = getSeededIdentity("execOne");
const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("session service caching and validation", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("session-cache");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
    sessionCache.clear();
  });

  afterEach(() => {
    sessionCache.clear();
  });

  function makeService() {
    return createSessionService({
      sessions: createAuthSessionRepo(ctx.db),
      users: createAuthUsersRepo(ctx.db),
      events: createEventsRepo(ctx.db),
      now: () => NOW,
      logger: { error() {} },
    });
  }

  async function seedSession(
    sessionId: string,
    overrides: { session_class?: "app" | "pre_auth" } = {},
  ) {
    await ctx.db
      .insertInto("user_sessions")
      .values({
        id: sessionId,
        user_id: IDENTITY.userId,
        branch_id: IDENTITY.branchId,
        role: IDENTITY.role,
        session_class: overrides.session_class ?? "app",
        primary_auth_method: "password",
        strong_auth_method: null,
        strong_auth_at: null,
        impersonator_user_id: null,
        ip_address: null,
        user_agent: null,
        created_at: NOW,
        last_activity: NOW,
        expires_at: new Date(NOW.getTime() + 60 * 60 * 1000),
      })
      .execute();
  }

  // A removed role cannot pass the Role union, so seed its stale value with SQL.
  async function corruptSessionRole(sessionId: string) {
    await sql`update user_sessions set role = 'retired_role' where id = ${sessionId}`.execute(
      ctx.db,
    );
  }

  it("resolves a session from the database and reflects its persisted session class", async () => {
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    await seedSession(sessionId, { session_class: "pre_auth" });

    const result = await makeService().resolve(token);

    expect(result?.sessionClass).toBe("pre_auth");
    expect(result?.role).toBe(IDENTITY.role);
  });

  it("keeps returning the cached session after the underlying row changes", async () => {
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    await seedSession(sessionId);
    const service = makeService();

    const first = await service.resolve(token);
    expect(first?.role).toBe(IDENTITY.role);

    // A changed second result would prove that resolve bypassed the cache.
    await ctx.db
      .updateTable("user_sessions")
      .set({ role: "supervisor" })
      .where("id", "=", sessionId)
      .execute();

    const second = await service.resolve(token);
    expect(second?.role).toBe(IDENTITY.role);
  });

  it("clears the cache and deletes every session when revoking all sessions for a user", async () => {
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    await seedSession(sessionId);
    const service = makeService();

    expect(await service.resolve(token)).not.toBeNull();

    await service.revokeAllForUser(IDENTITY.userId);

    expect(await service.resolve(token)).toBeNull();
    expect(await ctx.repos.sessions.findById(sessionId)).toBeNull();
  });

  it("deletes the session when the persisted role is no longer a valid role", async () => {
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    await seedSession(sessionId);
    await corruptSessionRole(sessionId);

    const result = await makeService().resolve(token);

    expect(result).toBeNull();
    expect(await ctx.repos.sessions.findById(sessionId)).toBeNull();
  });
});
