import { describe, expect, it } from "vitest";

import { revokeAllUserSessions } from "../../src/server/auth/application/commands/revoke-all-user-sessions";
import { revokeUserSession } from "../../src/server/auth/application/commands/revoke-user-session";
import type { AdminSessionRevocationPort } from "../../src/server/auth/application/ports";
import type { AppContext } from "../../src/server/shared/action-runtime";
import { asBranchId, asUserId, type UserId } from "../../src/server/shared/ids";

type AuditPayload = {
  userId: UserId;
  action: string;
  entityType: string;
  entityId: string;
  changes: string;
  createdAt: number;
};

function makeContext(): AppContext {
  return {
    actor: {
      id: "sid-admin",
      userId: asUserId("00000000-0000-0000-0000-000000009001"),
      branchId: asBranchId("00000000-0000-0000-0000-000000000001"),
      role: "admin",
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "passkey",
      strongAuthMethod: "passkey",
      strongAuthAt: 1_700_000_000_000,
    },
    requestId: "req-test",
    traceId: "trace-test",
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
    publicOrigin: "http://localhost:3000",
    now: () => 1_700_000_100_000,
  };
}

function makeDeps() {
  const auditLogs: AuditPayload[] = [];
  const invalidatedSessions: string[] = [];
  const invalidatedUsers: UserId[] = [];
  const authSessionRevocations: Array<{ sessionId: string; now: number }> = [];
  const userRevocations: Array<{ userId: UserId; now: number }> = [];
  const syncUpdates: Array<{
    userId: UserId;
    syncHealth: string;
    syncUpdatedAt: number;
  }> = [];

  return {
    port: {
      invalidateSession: async (sessionId: string) => {
        invalidatedSessions.push(sessionId);
      },
      invalidateUserSessions: async (userId: UserId) => {
        invalidatedUsers.push(userId);
      },
      revokeInstallationSessionsByAuthSession: async (
        sessionId: string,
        now: number,
      ) => {
        authSessionRevocations.push({ sessionId, now });
      },
      revokeInstallationSessionsByUser: async (userId: UserId, now: number) => {
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

    const result = await revokeUserSession(makeContext(), harness.port, {
      sessionId: "session-abc",
      targetUserId: asUserId("00000000-0000-0000-0000-000000000042"),
    });

    expect(result.ok).toBe(true);
    expect(harness.invalidatedSessions).toEqual(["session-abc"]);
    expect(harness.authSessionRevocations).toEqual([
      { sessionId: "session-abc", now: 1_700_000_100_000 },
    ]);
    expect(harness.syncUpdates).toEqual([
      {
        userId: asUserId("00000000-0000-0000-0000-000000000042"),
        syncHealth: "reauth_required",
        syncUpdatedAt: 1_700_000_100_000,
      },
    ]);
    expect(harness.auditLogs).toHaveLength(1);
    expect(harness.auditLogs[0]).toMatchObject({
      userId: asUserId("00000000-0000-0000-0000-000000009001"),
      action: "session_revoked_by_admin",
      entityType: "user_session",
      entityId: "00000000-0000-0000-0000-000000000042",
      createdAt: 1_700_000_100_000,
    });
    expect(JSON.parse(harness.auditLogs[0].changes)).toEqual({
      sessionId: "session-abc",
      revokedBy: "00000000-0000-0000-0000-000000009001",
    });
  });

  it("revokes all user sessions and writes a single audit record", async () => {
    const harness = makeDeps();

    const result = await revokeAllUserSessions(makeContext(), harness.port, {
      targetUserId: asUserId("00000000-0000-0000-0000-000000000077"),
    });

    expect(result.ok).toBe(true);
    expect(harness.invalidatedUsers).toEqual([
      asUserId("00000000-0000-0000-0000-000000000077"),
    ]);
    expect(harness.userRevocations).toEqual([
      {
        userId: asUserId("00000000-0000-0000-0000-000000000077"),
        now: 1_700_000_100_000,
      },
    ]);
    expect(harness.syncUpdates).toEqual([
      {
        userId: asUserId("00000000-0000-0000-0000-000000000077"),
        syncHealth: "reauth_required",
        syncUpdatedAt: 1_700_000_100_000,
      },
    ]);
    expect(harness.auditLogs).toHaveLength(1);
    expect(harness.auditLogs[0]).toMatchObject({
      userId: asUserId("00000000-0000-0000-0000-000000009001"),
      action: "all_sessions_revoked",
      entityType: "user",
      entityId: "00000000-0000-0000-0000-000000000077",
      createdAt: 1_700_000_100_000,
    });
    expect(JSON.parse(harness.auditLogs[0].changes)).toEqual({
      revokedBy: "00000000-0000-0000-0000-000000009001",
    });
  });
});
