export interface AdminSessionRevocationPort {
  invalidateSession(sessionId: string): Promise<void>;
  invalidateUserSessions(userId: number): Promise<void>;
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
  createAuditLog(input: {
    userId: number;
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
    userId: number;
    syncHealth: "ok" | "stale" | "reauth_required";
    syncUpdatedAt: number;
  }): Promise<void>;
  clearSessionCookie(): void;
  createAuditLog(input: {
    userId: number;
    action: string;
    entityType: string;
    entityId: string;
    changes: string | null;
    createdAt: number;
  }): Promise<void>;
}
