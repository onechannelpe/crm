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
    entityId: number;
    changes: string | null;
    createdAt: number;
  }): Promise<void>;
}
