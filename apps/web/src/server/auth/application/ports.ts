export interface AdminSessionRevocationPort {
  invalidateSession(sessionId: string): Promise<void>;
  invalidateUserSessions(userId: number): Promise<void>;
  revokeInstallationSessionsByAuthSession(
    sessionId: string,
    now: number,
  ): Promise<void>;
  revokeInstallationSessionsByUser(userId: number, now: number): Promise<void>;
  updateExecutiveSyncHealthByUser(input: {
    user_id: number;
    sync_health: "ok" | "stale" | "reauth_required";
    sync_updated_at: number;
  }): Promise<void>;
  createAuditLog(input: {
    user_id: number;
    action: string;
    entity_type: string;
    entity_id: number;
    changes: string | null;
    created_at: number;
  }): Promise<void>;
}
