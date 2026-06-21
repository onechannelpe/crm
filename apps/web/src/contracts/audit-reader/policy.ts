export type AuditPolicyRiskLevel = "high" | "medium" | "low";

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
