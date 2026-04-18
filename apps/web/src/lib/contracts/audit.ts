import { type UserId } from "~/server/shared/ids";

export interface SessionRevokedByAdminChanges {
  sessionId: string;
  revokedBy: UserId;
}

export interface AllSessionsRevokedChanges {
  revokedBy: UserId;
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
  revokedBy: UserId,
): SessionRevokedByAdminChanges {
  return { sessionId, revokedBy };
}

export function allSessionsRevokedChanges(
  revokedBy: UserId,
): AllSessionsRevokedChanges {
  return { revokedBy };
}
