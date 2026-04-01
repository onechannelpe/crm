import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  invalidateSession,
  invalidateUserSessions,
} from "~/lib/auth/session/session-manager";

import {
  revokeAllUserSessions,
  revokeUserSession,
} from "../../src/server/auth/application/admin-sessions";
import type { AppContext } from "../../src/server/shared/action-runtime";

vi.mock("~/lib/auth/session/session-manager", () => ({
  invalidateSession: vi.fn<(sessionId: string) => Promise<void>>(),
  invalidateUserSessions: vi.fn<(userId: number) => Promise<void>>(),
}));

type AuditPayload = {
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  changes: string;
  created_at: number;
};

function makeContext(): AppContext {
  return {
    actor: {
      sessionId: "sid-admin",
      userId: 9001,
      branchId: 1,
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
  const authSessionRevocations: Array<{ sessionId: string; now: number }> = [];
  const userRevocations: Array<{ userId: number; now: number }> = [];
  const syncUpdates: Array<{
    user_id: number;
    sync_health: string;
    sync_updated_at: number;
  }> = [];

  return {
    deps: {
      repos: {
        extensionRuntime: {
          revokeInstallationSessionsByAuthSession: async (
            sessionId: string,
            now: number,
          ) => {
            authSessionRevocations.push({ sessionId, now });
          },
          revokeInstallationSessionsByUser: async (
            userId: number,
            now: number,
          ) => {
            userRevocations.push({ userId, now });
          },
          updateExecutiveSyncHealthByUser: async (payload: {
            user_id: number;
            sync_health: string;
            sync_updated_at: number;
          }) => {
            syncUpdates.push(payload);
          },
        },
        auditLogs: {
          create: async (payload: AuditPayload) => {
            auditLogs.push(payload);
          },
        },
      },
    },
    auditLogs,
    authSessionRevocations,
    userRevocations,
    syncUpdates,
  };
}

describe("admin session revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invalidateSession).mockResolvedValue(undefined);
    vi.mocked(invalidateUserSessions).mockResolvedValue(undefined);
  });

  it("revokes one session and writes an audit record for the target user", async () => {
    const harness = makeDeps();

    const result = await revokeUserSession(makeContext(), harness.deps, {
      sessionId: "session-abc",
      targetUserId: 42,
    });

    expect(result.ok).toBe(true);
    expect(invalidateSession).toHaveBeenCalledWith("session-abc");
    expect(harness.authSessionRevocations).toEqual([
      { sessionId: "session-abc", now: 1_700_000_100_000 },
    ]);
    expect(harness.syncUpdates).toEqual([
      {
        user_id: 42,
        sync_health: "reauth_required",
        sync_updated_at: 1_700_000_100_000,
      },
    ]);
    expect(harness.auditLogs).toHaveLength(1);
    expect(harness.auditLogs[0]).toMatchObject({
      user_id: 9001,
      action: "session_revoked_by_admin",
      entity_type: "user_session",
      entity_id: 42,
      created_at: 1_700_000_100_000,
    });
    expect(JSON.parse(harness.auditLogs[0].changes)).toEqual({
      sessionId: "session-abc",
      revokedBy: 9001,
    });
  });

  it("revokes all user sessions and writes a single audit record", async () => {
    const harness = makeDeps();

    const result = await revokeAllUserSessions(makeContext(), harness.deps, {
      targetUserId: 77,
    });

    expect(result.ok).toBe(true);
    expect(invalidateUserSessions).toHaveBeenCalledWith(77);
    expect(harness.userRevocations).toEqual([
      { userId: 77, now: 1_700_000_100_000 },
    ]);
    expect(harness.syncUpdates).toEqual([
      {
        user_id: 77,
        sync_health: "reauth_required",
        sync_updated_at: 1_700_000_100_000,
      },
    ]);
    expect(harness.auditLogs).toHaveLength(1);
    expect(harness.auditLogs[0]).toMatchObject({
      user_id: 9001,
      action: "all_sessions_revoked",
      entity_type: "user",
      entity_id: 77,
      created_at: 1_700_000_100_000,
    });
    expect(JSON.parse(harness.auditLogs[0].changes)).toEqual({
      revokedBy: 9001,
    });
  });
});
