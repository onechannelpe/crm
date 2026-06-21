export interface AdminSessionRevocationPort {
  revokeSession(sessionId: string): Promise<void>;
  revokeUserSessions(userId: number): Promise<void>;
  revokeInstallationSessionsByAuthSession(
    sessionId: string,
    now: number,
  ): Promise<void>;
  revokeInstallationSessionsByUser(userId: number, now: number): Promise<void>;
  updateExecutiveSyncHealth(input: {
    userId: number;
    syncHealth: "ok" | "stale" | "reauth_required";
    syncUpdatedAt: number;
  }): Promise<void>;
  appendEvent(input: {
    type: string;
    entityType: string;
    entityId: string | number;
    actorUserId: number;
    payload?: unknown;
    occurredAt: number;
  }): Promise<void>;
}

export interface AuthSessionLogoutPort {
  revokeSession(sessionId: string): Promise<void>;
  revokeInstallationSessionsByAuthSession(
    sessionId: string,
    now: number,
  ): Promise<void>;
  updateExecutiveSyncHealth(input: {
    userId: number;
    syncHealth: "ok" | "stale" | "reauth_required";
    syncUpdatedAt: number;
  }): Promise<void>;
  clearSessionCookie(): void;
  appendEvent(input: {
    type: string;
    entityType: string;
    entityId: string | number;
    actorUserId: number;
    payload?: unknown;
    occurredAt: number;
  }): Promise<void>;
}
