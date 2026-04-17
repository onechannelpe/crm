import type { UserId } from "~/server/shared/ids";

export interface AdminSessionRevocationPort {
  invalidateSession(sessionId: string): Promise<void>;
  invalidateUserSessions(userId: UserId): Promise<void>;
  revokeInstallationSessionsByAuthSession(
    sessionId: string,
    now: number,
  ): Promise<void>;
  revokeInstallationSessionsByUser(userId: UserId, now: number): Promise<void>;
  updateExecutiveSyncHealth(input: {
    userId: UserId;
    syncHealth: "ok" | "stale" | "reauth_required";
    syncUpdatedAt: number;
  }): Promise<void>;
  createAuditLog(input: {
    userId: UserId;
    action: string;
    entityType: string;
    entityId: string;
    changes: string | null;
    createdAt: number;
  }): Promise<void>;
}

export interface AuthSessionLogoutPort {
  invalidateSession(sessionId: string): Promise<void>;
  revokeInstallationSessionsByAuthSession(
    sessionId: string,
    now: number,
  ): Promise<void>;
  updateExecutiveSyncHealth(input: {
    userId: UserId;
    syncHealth: "ok" | "stale" | "reauth_required";
    syncUpdatedAt: number;
  }): Promise<void>;
  clearSessionCookie(): void;
  createAuditLog(input: {
    userId: UserId;
    action: string;
    entityType: string;
    entityId: string;
    changes: string | null;
    createdAt: number;
  }): Promise<void>;
}
