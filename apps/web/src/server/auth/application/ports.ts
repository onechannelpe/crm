import type { UserId } from "~/domain/ids";

export interface AdminSessionRevocationPort {
  revokeSession(sessionId: string): Promise<void>;
  revokeUserSessions(userId: UserId): Promise<void>;
  revokeInstallationSessionsByAuthSession(
    sessionId: string,
    now: Date,
  ): Promise<void>;
  revokeInstallationSessionsByUser(userId: UserId, now: Date): Promise<void>;
  updateExecutiveSyncHealth(input: {
    userId: UserId;
    syncHealth: "ok" | "stale" | "reauth_required";
    syncUpdatedAt: Date;
  }): Promise<void>;
  appendEvent(input: {
    type: string;
    entityType: string;
    entityId: string;
    actorUserId: UserId;
    payload?: unknown;
    occurredAt: Date;
  }): Promise<void>;
}

export interface AuthSessionLogoutPort {
  revokeSession(sessionId: string): Promise<void>;
  revokeInstallationSessionsByAuthSession(
    sessionId: string,
    now: Date,
  ): Promise<void>;
  updateExecutiveSyncHealth(input: {
    userId: UserId;
    syncHealth: "ok" | "stale" | "reauth_required";
    syncUpdatedAt: Date;
  }): Promise<void>;
  appendEvent(input: {
    type: string;
    entityType: string;
    entityId: string;
    actorUserId: UserId;
    payload?: unknown;
    occurredAt: Date;
  }): Promise<void>;
}
