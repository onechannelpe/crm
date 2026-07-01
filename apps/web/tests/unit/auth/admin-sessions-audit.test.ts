import { makeActor, makeAppContext } from "@tests/support/unit/factories";
import { describe, expect, it } from "vitest";

import type { AdminSessionRevocationPort } from "~/server/auth/application/ports";
import { revokeAllUserSessions } from "~/server/auth/flows/revoke-all-user-sessions";
import { revokeUserSession } from "~/server/auth/flows/revoke-user-session";
import { asUserId } from "~/server/shared/ids";

type AppendedEvent = {
  type: string;
  entityType: string;
  entityId: string;
  actorUserId: ReturnType<typeof asUserId>;
  payload?: unknown;
  occurredAt: Date;
};

const ACTOR_USER_ID = asUserId("9001");
const NOW_MS = 1_700_000_100_000;
const NOW = new Date(NOW_MS);

function makeTestContext() {
  return makeAppContext({
    actor: makeActor({
      id: "sid-admin",
      userId: ACTOR_USER_ID,
      role: "admin",
      primaryAuthMethod: "passkey",
      strongAuthMethod: "passkey",
      strongAuthAt: new Date(1_700_000_000_000),
    }),
    now: () => NOW,
  });
}

function makeDeps() {
  const events: AppendedEvent[] = [];
  const invalidatedSessions: string[] = [];
  const invalidatedUsers: ReturnType<typeof asUserId>[] = [];
  const authSessionRevocations: Array<{
    sessionId: string;
    now: Date;
  }> = [];
  const userRevocations: Array<{
    userId: ReturnType<typeof asUserId>;
    now: Date;
  }> = [];
  const syncUpdates: Array<{
    userId: ReturnType<typeof asUserId>;
    syncHealth: "ok" | "stale" | "reauth_required";
    syncUpdatedAt: Date;
  }> = [];

  return {
    port: {
      revokeSession: async (sessionId: string) => {
        invalidatedSessions.push(sessionId);
      },
      revokeUserSessions: async (userId: ReturnType<typeof asUserId>) => {
        invalidatedUsers.push(userId);
      },
      revokeInstallationSessionsByAuthSession: async (
        sessionId: string,
        now: Date,
      ) => {
        authSessionRevocations.push({ sessionId, now });
      },
      revokeInstallationSessionsByUser: async (
        userId: ReturnType<typeof asUserId>,
        now: Date,
      ) => {
        userRevocations.push({ userId, now });
      },
      updateExecutiveSyncHealth: async (payload) => {
        syncUpdates.push(payload);
      },
      appendEvent: async (event: AppendedEvent) => {
        events.push(event);
      },
    } satisfies AdminSessionRevocationPort,
    events,
    invalidatedSessions,
    invalidatedUsers,
    authSessionRevocations,
    userRevocations,
    syncUpdates,
  };
}

describe("admin session revocation", () => {
  it("revokes one session and appends an event for the target user", async () => {
    const harness = makeDeps();
    const targetUserId = asUserId("42");

    const result = await revokeUserSession(makeTestContext(), harness.port, {
      sessionId: "session-abc",
      targetUserId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(harness.invalidatedSessions).toEqual(["session-abc"]);
    expect(harness.authSessionRevocations).toEqual([
      { sessionId: "session-abc", now: NOW },
    ]);
    expect(harness.syncUpdates).toEqual([
      {
        userId: targetUserId,
        syncHealth: "reauth_required",
        syncUpdatedAt: NOW,
      },
    ]);
    expect(harness.events).toHaveLength(1);
    expect(harness.events[0]).toMatchObject({
      type: "session_revoked_by_admin",
      entityType: "user_session",
      entityId: "session-abc",
      actorUserId: ACTOR_USER_ID,
      occurredAt: NOW,
    });
    expect(harness.events[0].payload).toEqual({
      targetUserId,
      revokedBy: ACTOR_USER_ID,
    });
  });

  it("revokes all user sessions and appends a single event", async () => {
    const harness = makeDeps();
    const targetUserId = asUserId("77");

    const result = await revokeAllUserSessions(
      makeTestContext(),
      harness.port,
      {
        targetUserId,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(harness.invalidatedUsers).toEqual([targetUserId]);
    expect(harness.userRevocations).toEqual([
      { userId: targetUserId, now: NOW },
    ]);
    expect(harness.syncUpdates).toEqual([
      {
        userId: targetUserId,
        syncHealth: "reauth_required",
        syncUpdatedAt: NOW,
      },
    ]);
    expect(harness.events).toHaveLength(1);
    expect(harness.events[0]).toMatchObject({
      type: "all_sessions_revoked",
      entityType: "user",
      entityId: "77",
      actorUserId: ACTOR_USER_ID,
      occurredAt: NOW,
    });
    expect(harness.events[0].payload).toEqual({
      revokedBy: ACTOR_USER_ID,
    });
  });
});
