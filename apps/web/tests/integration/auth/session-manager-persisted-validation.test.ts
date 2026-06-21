import { getSeededIdentity } from "@tests/support/identities/api";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { sessionCache } from "~/lib/auth/session/session-cache";
import {
  generateSessionToken,
  hashSessionToken,
} from "~/lib/auth/session/tokens";

describe("session manager persisted validation", () => {
  let runtime: TestRuntime;
  const execOne = getSeededIdentity("execOne");

  beforeEach(async () => {
    runtime = await createTestRuntime("session-manager-persisted");
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

    await runtime.ctx.db
      .insertInto("user_sessions")
      .values({
        id: sessionId,
        user_id: execOne.userId,
        branch_id: execOne.branchId,
        // @ts-expect-error intentional persisted corruption case
        role: "invalid_role",
        session_class: "app",
        primary_auth_method: "password",
        strong_auth_method: null,
        strong_auth_at: null,
        ip_address: null,
        user_agent: null,
        created_at: now,
        last_activity: now,
        expires_at: now + 60_000,
      })
      .execute();

    const result = await runtime.auth.sessionService.resolve(token);
    expect(result).toBeNull();
    expect(await runtime.ctx.repos.sessions.findById(sessionId)).toBeNull();
  });
});
