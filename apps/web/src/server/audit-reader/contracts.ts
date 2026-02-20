export const AUDIT_READER_MAX_LIMIT = 200;
export const AUDIT_READER_DEFAULT_LIMIT = 80;
export const AUDIT_READER_MAX_WINDOW_MINUTES = 60 * 24 * 30;
export const AUDIT_READER_DEFAULT_WINDOW_MINUTES = 1440;

export type AuditPolicyRiskLevel = "high" | "medium" | "low";

export interface AuditReaderFilterInput {
  windowMinutes?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  actorUserId?: number;
  onlyHighRisk?: boolean;
}

export interface AuditReaderQueryFilter {
  fromInclusive: number;
  toInclusive: number;
  limit: number;
  action?: string;
  entityType?: string;
  actorUserId?: number;
  onlyHighRisk?: boolean;
}

export interface AuditReaderEvent {
  id: number;
  createdAt: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  changes: string | null;
}

export interface AuditReaderSnapshot {
  windowMinutes: number;
  events: AuditReaderEvent[];
}

export interface AuditActionPolicyItem {
  action: string;
  riskLevel: AuditPolicyRiskLevel;
  isActive: boolean;
  isProtected: boolean;
  updatedByUserId: number | null;
  updatedAt: number;
  createdAt: number;
}

export interface AuditPolicySnapshot {
  items: AuditActionPolicyItem[];
}
