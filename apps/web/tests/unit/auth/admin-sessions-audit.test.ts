import { describe, expect, it } from "vitest";

import type { AdminSessionRevocationPort } from "~/server/auth/application/ports";
import { revokeAllUserSessions } from "~/server/auth/flows/revoke-all-user-sessions";
import { revokeUserSession } from "~/server/auth/flows/revoke-user-session";

type AuditPayload = {
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  changes: string;
  createdAt: number;
};

import { makeActor, makeAppContext } from "@tests/support/unit/factories";

import type { UserId } from "~/server/shared/ids";

function makeTestContext() {
  return makeAppContext({
    actor: makeActor({
      id: "sid-admin",
      userId: 9001 as UserId,
      role: "admin",
      primaryAuthMethod: "passkey",
      strongAuthMethod: "passkey",
      strongAuthAt: 1_700_000_000_000,
    }),
    now: () => 1_700_000_100_000,
  });
}

function makeDeps() {
  const auditLogs: AuditPayload[] = [];
  const invalidatedSessions: string[] = [];
  const invalidatedUsers: number[] = [];
  const authSessionRevocations: Array<{ sessionId: string; now: number }> = [];
  const userRevocations: Array<{ userId: number; now: number }> = [];
  const syncUpdates: Array<{
    userId: number;
    syncHealth: string;
    syncUpdatedAt: number;
  }> = [];

  return {
    port: {
      revokeSession: async (sessionId: string) => {
        invalidatedSessions.push(sessionId);
      },
      revokeUserSessions: async (userId: number) => {
        invalidatedUsers.push(userId);
      },
      revokeInstallationSessionsByAuthSession: async (
        sessionId: string,
        now: number,
      ) => {
        authSessionRevocations.push({ sessionId, now });
      },
      revokeInstallationSessionsByUser: async (userId: number, now: number) => {
        userRevocations.push({ userId, now });
      },
      updateExecutiveSyncHealth: async (payload) => {
        syncUpdates.push(payload);
      },
      createAuditLog: async (payload: AuditPayload) => {
        auditLogs.push(payload);
      },
    } satisfies AdminSessionRevocationPort,
    auditLogs,
    invalidatedSessions,
    invalidatedUsers,
    authSessionRevocations,
    userRevocations,
    syncUpdates,
  };
}

describe("admin session revocation", () => {
  it("revokes one session and writes an audit record for the target user", async () => {
    const harness = makeDeps();

    const result = await revokeUserSession(makeTestContext(), harness.port, {
      sessionId: "session-abc",
      targetUserId: 42,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(harness.invalidatedSessions).toEqual(["session-abc"]);
    expect(harness.authSessionRevocations).toEqual([
      { sessionId: "session-abc", now: 1_700_000_100_000 },
    ]);
    expect(harness.syncUpdates).toEqual([
      {
        userId: 42,
        syncHealth: "reauth_required",
        syncUpdatedAt: 1_700_000_100_000,
      },
    ]);
    expect(harness.auditLogs).toHaveLength(1);
    expect(harness.auditLogs[0]).toMatchObject({
      userId: 9001,
      action: "session_revoked_by_admin",
      entityType: "user_session",
      entityId: 42,
      createdAt: 1_700_000_100_000,
    });
    expect(JSON.parse(harness.auditLogs[0].changes)).toEqual({
      sessionId: "session-abc",
      revokedBy: 9001,
    });
  });

  it("revokes all user sessions and writes a single audit record", async () => {
    const harness = makeDeps();

    const result = await revokeAllUserSessions(
      makeTestContext(),
      harness.port,
      {
        targetUserId: 77,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    expect(harness.invalidatedUsers).toEqual([77]);
    expect(harness.userRevocations).toEqual([
      { userId: 77, now: 1_700_000_100_000 },
    ]);
    expect(harness.syncUpdates).toEqual([
      {
        userId: 77,
        syncHealth: "reauth_required",
        syncUpdatedAt: 1_700_000_100_000,
      },
    ]);
    expect(harness.auditLogs).toHaveLength(1);
    expect(harness.auditLogs[0]).toMatchObject({
      userId: 9001,
      action: "all_sessions_revoked",
      entityType: "user",
      entityId: 77,
      createdAt: 1_700_000_100_000,
    });
    expect(JSON.parse(harness.auditLogs[0].changes)).toEqual({
      revokedBy: 9001,
    });
  });
});
