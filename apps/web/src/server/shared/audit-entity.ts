import type { BranchId, TeamId, UserId } from "./ids";

export type AuditEntityType =
  | "branch"
  | "lead"
  | "passkey"
  | "team"
  | "user"
  | "user_session";

export function auditEntityId(type: "branch", id: BranchId): string;
export function auditEntityId(type: "lead", id: string): string;
export function auditEntityId(type: "passkey", id: UserId): string;
export function auditEntityId(type: "team", id: TeamId): string;
export function auditEntityId(type: "user", id: UserId): string;
export function auditEntityId(type: "user_session", id: string): string;
export function auditEntityId(
  _type: AuditEntityType,
  id: number | string,
): string {
  return String(id);
}
