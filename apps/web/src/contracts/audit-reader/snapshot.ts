import type { FieldChange } from "~/contracts/events";

export interface AuditReaderFilterInput {
  windowMinutes?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  actorUserId?: string;
  onlyHighRisk?: boolean;
}

export interface AuditReaderEvent {
  id: string;
  occurredAt: number;
  actorUserId: string | null;
  type: string;
  entityType: string;
  entityId: string;
  changes: FieldChange[];
  payload: unknown;
}

export interface AuditReaderSnapshot {
  windowMinutes: number;
  events: AuditReaderEvent[];
}
