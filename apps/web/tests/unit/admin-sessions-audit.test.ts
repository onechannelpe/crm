import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  recordAction: vi.fn(),
  invalidateSession: vi.fn(),
  invalidateUserSessions: vi.fn(),
  auditCreate: vi.fn(),
  revokeInstallationSessionsByAuthSession: vi.fn(),
  revokeInstallationSessionsByUser: vi.fn(),
  updateExecutiveSyncHealthByUser: vi.fn(),
}));

vi.mock("~/lib/auth/access/session", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("~/lib/http/request-context", () => ({
  getRequestContext: () => ({
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    publicOrigin: "http://localhost:3000",
  }),
}));

vi.mock("~/lib/observability/context", () => ({
  getActionRequestContext: () => ({
    traceId: "trace-test",
    requestId: "req-test",
    routePath: null,
    httpMethod: null,
    requestStartedAt: 1_700_000_000_000,
  }),
}));

vi.mock("~/lib/auth/session/session-manager", () => ({
  invalidateSession: mocks.invalidateSession,
  invalidateUserSessions: mocks.invalidateUserSessions,
}));

vi.mock("~/server/shared/context", () => ({
  repos: {
    extensionRuntime: {
      revokeInstallationSessionsByAuthSession:
        mocks.revokeInstallationSessionsByAuthSession,
      revokeInstallationSessionsByUser: mocks.revokeInstallationSessionsByUser,
      updateExecutiveSyncHealthByUser: mocks.updateExecutiveSyncHealthByUser,
    },
    auditLogs: {
      create: mocks.auditCreate,
    },
  },
  observabilityService: {
    recordAction: mocks.recordAction,
  },
}));

import {
  revokeAllUserSessions,
  revokeUserSession,
} from "../../src/actions/admin";

describe("admin sessions audit contracts", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset();
    mocks.recordAction.mockReset();
    mocks.invalidateSession.mockReset();
    mocks.invalidateUserSessions.mockReset();
    mocks.auditCreate.mockReset();
    mocks.revokeInstallationSessionsByAuthSession.mockReset();
    mocks.revokeInstallationSessionsByUser.mockReset();
    mocks.updateExecutiveSyncHealthByUser.mockReset();

    mocks.requireRole.mockResolvedValue({
      sessionId: "sid-admin",
      userId: 9001,
      branchId: 1,
      role: "admin",
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "passkey",
      strongAuthMethod: "passkey",
      strongAuthAt: Date.now(),
    });
    mocks.recordAction.mockResolvedValue(undefined);
    mocks.invalidateSession.mockResolvedValue(undefined);
    mocks.invalidateUserSessions.mockResolvedValue(undefined);
    mocks.auditCreate.mockResolvedValue(undefined);
    mocks.revokeInstallationSessionsByAuthSession.mockResolvedValue(undefined);
    mocks.revokeInstallationSessionsByUser.mockResolvedValue(undefined);
    mocks.updateExecutiveSyncHealthByUser.mockResolvedValue(undefined);
  });

  it("logs revokeUserSession with actor as user_id and target as entity_id", async () => {
    await revokeUserSession("session-abc", 42);

    expect(mocks.invalidateSession).toHaveBeenCalledWith("session-abc");
    expect(mocks.revokeInstallationSessionsByAuthSession).toHaveBeenCalledWith(
      "session-abc",
      expect.any(Number),
    );
    expect(mocks.updateExecutiveSyncHealthByUser).toHaveBeenCalledWith({
      user_id: 42,
      sync_health: "reauth_required",
      sync_updated_at: expect.any(Number),
    });
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    const payload = mocks.auditCreate.mock.calls[0]?.[0];
    expect(payload.user_id).toBe(9001);
    expect(payload.entity_id).toBe(42);
    expect(payload.action).toBe("session_revoked_by_admin");

    const changesRaw = payload.changes;
    expect(typeof changesRaw).toBe("string");
    const changes =
      typeof changesRaw === "string"
        ? JSON.parse(changesRaw)
        : { sessionId: "", revokedBy: null };
    expect(changes.sessionId).toBe("session-abc");
    expect(changes.revokedBy).toBe(9001);
  });

  it("logs revokeAllUserSessions with actor and target fields", async () => {
    await revokeAllUserSessions(77);

    expect(mocks.invalidateUserSessions).toHaveBeenCalledWith(77);
    expect(mocks.revokeInstallationSessionsByUser).toHaveBeenCalledWith(
      77,
      expect.any(Number),
    );
    expect(mocks.updateExecutiveSyncHealthByUser).toHaveBeenCalledWith({
      user_id: 77,
      sync_health: "reauth_required",
      sync_updated_at: expect.any(Number),
    });
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    const payload = mocks.auditCreate.mock.calls[0]?.[0];
    expect(payload.user_id).toBe(9001);
    expect(payload.entity_id).toBe(77);
    expect(payload.action).toBe("all_sessions_revoked");

    const changesRaw = payload.changes;
    expect(typeof changesRaw).toBe("string");
    const changes =
      typeof changesRaw === "string"
        ? JSON.parse(changesRaw)
        : { revokedBy: null };
    expect(changes.revokedBy).toBe(9001);
  });

  it("revokeUserSession throws when strong auth is missing and no repo is touched", async () => {
    mocks.requireRole.mockResolvedValue({
      sessionId: "sid-admin",
      userId: 9001,
      branchId: 1,
      role: "admin",
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
    });

    await expect(revokeUserSession("session-abc", 42)).rejects.toThrow();

    expect(mocks.invalidateSession).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("revokeAllUserSessions throws when strong auth is missing and no repo is touched", async () => {
    mocks.requireRole.mockResolvedValue({
      sessionId: "sid-admin",
      userId: 9001,
      branchId: 1,
      role: "admin",
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
    });

    await expect(revokeAllUserSessions(77)).rejects.toThrow();

    expect(mocks.invalidateUserSessions).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
