import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  invalidateUserSessions: vi.fn(),
  sessionsDelete: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("~/lib/auth/session", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("~/lib/auth/session-manager", () => ({
  invalidateUserSessions: mocks.invalidateUserSessions,
}));

vi.mock("~/server/shared/context", () => ({
  repos: {
    sessions: {
      delete: mocks.sessionsDelete,
      listForUser: vi.fn(),
      countActive: vi.fn(),
      db: {},
    },
    auditLogs: {
      create: mocks.auditCreate,
    },
  },
}));

import {
  revokeAllUserSessions,
  revokeUserSession,
} from "../../src/actions/admin-sessions";

describe("admin sessions audit contracts", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset();
    mocks.invalidateUserSessions.mockReset();
    mocks.sessionsDelete.mockReset();
    mocks.auditCreate.mockReset();

    mocks.requireRole.mockResolvedValue({
      userId: 9001,
      branchId: 1,
      role: "admin",
    });
    mocks.sessionsDelete.mockResolvedValue(undefined);
    mocks.invalidateUserSessions.mockResolvedValue(undefined);
    mocks.auditCreate.mockResolvedValue(undefined);
  });

  it("logs revokeUserSession with actor as user_id and target as entity_id", async () => {
    await revokeUserSession("session-abc", 42);

    expect(mocks.sessionsDelete).toHaveBeenCalledWith("session-abc");
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
});
