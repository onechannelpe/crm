import { getSeededIdentity } from "@tests/support/identities/api";
import { createSessionServiceHarness } from "@tests/support/unit/session-service-harness";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { sessionCache } from "~/lib/auth/session/session-cache";
import {
  generateSessionToken,
  hashSessionToken,
} from "~/lib/auth/session/tokens";
import type { UserSessionRow } from "~/lib/auth/types";

const execOne = getSeededIdentity("execOne");

function buildSessionRow(sessionId: string, nowTs: number): UserSessionRow {
  const expiresAt = Date.now() + 60 * 60 * 1000;
  return {
    id: sessionId,
    user_id: execOne.userId,
    branch_id: execOne.branchId,
    role: execOne.role,
    session_class: "app",
    primary_auth_method: "password",
    strong_auth_method: null,
    strong_auth_at: null,
    ip_address: null,
    user_agent: null,
    created_at: nowTs,
    last_activity: nowTs,
    expires_at: expiresAt,
  };
}

describe("session manager validation", () => {
  beforeEach(() => {
    sessionCache.clear();
  });

  afterEach(() => {
    sessionCache.clear();
  });

  it("returns cached session without reloading the user record", async () => {
    const nowTs = 1_700_000_000_000;
    const store = new Map<string, UserSessionRow>();
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    store.set(sessionId, buildSessionRow(sessionId, nowTs));

    const { service, spies } = createSessionServiceHarness(nowTs, store);
    const first = await service.validateSessionToken(token);
    expect(first.session).not.toBeNull();

    spies.usersFindById.mockClear();
    const second = await service.validateSessionToken(token);
    expect(second.session).not.toBeNull();
    expect(spies.usersFindById).not.toHaveBeenCalled();
  });

  it("removes cached sessions after explicit invalidation", async () => {
    const nowTs = 1_700_000_000_000;
    const store = new Map<string, UserSessionRow>();
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    store.set(sessionId, buildSessionRow(sessionId, nowTs));

    const { service } = createSessionServiceHarness(nowTs, store);
    const first = await service.validateSessionToken(token);
    expect(first.session).not.toBeNull();

    await service.invalidateUserSessions(execOne.userId);

    const second = await service.validateSessionToken(token);
    expect(second.session).toBeNull();
    expect(store.has(sessionId)).toBe(false);
  });

  it("derives onboarding completion from session class without user lookup", async () => {
    const nowTs = 1_700_000_000_000;
    const store = new Map<string, UserSessionRow>();
    const token = generateSessionToken();
    const sessionId = hashSessionToken(token);
    const row = buildSessionRow(sessionId, nowTs);
    store.set(sessionId, { ...row, session_class: "pre_auth" });

    const { service, spies } = createSessionServiceHarness(nowTs, store);
    const result = await service.validateSessionToken(token);

    expect(result.session?.onboardingCompleted).toBe(false);
    expect(spies.usersFindById).toHaveBeenCalledOnce();
  });
});
