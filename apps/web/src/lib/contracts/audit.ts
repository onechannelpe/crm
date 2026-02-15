export interface SessionRevokedByAdminChanges {
  sessionId: string;
  revokedBy: number;
}

export interface AllSessionsRevokedChanges {
  revokedBy: number;
}

export interface ProductUpdatedChanges {
  previous: { price: number; is_active: number };
  next: { price: number; is_active: number };
}

export function serializeAuditChanges(changes?: unknown): string | null {
  if (changes === undefined) return null;
  return JSON.stringify(changes);
}

export function sessionRevokedByAdminChanges(
  sessionId: string,
  revokedBy: number,
): SessionRevokedByAdminChanges {
  return { sessionId, revokedBy };
}

export function allSessionsRevokedChanges(
  revokedBy: number,
): AllSessionsRevokedChanges {
  return { revokedBy };
}
