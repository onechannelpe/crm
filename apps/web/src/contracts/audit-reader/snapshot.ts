import type { FieldChange } from "~/contracts/events";

export interface AuditReaderFilterInput {
  windowMinutes?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  actorUserId?: number;
  onlyHighRisk?: boolean;
}

export interface AuditReaderEvent {
  id: string;
  occurredAt: number;
  actorUserId: number | null;
  type: string;
  entityType: string;
  entityId: string;
  changes: FieldChange[];
  payload: string | null;
}

export interface AuditReaderSnapshot {
  windowMinutes: number;
  events: AuditReaderEvent[];
}
