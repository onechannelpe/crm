import type {
  AuditActionPolicyItem,
  AuditPolicyRiskLevel,
  AuditPolicySnapshot,
} from "~/contracts/audit-reader/policy";
import type { UserId } from "~/domain/ids";

interface AuditPolicyServiceDeps {
  auditActionPolicies: {
    listAll: () => Promise<
      Array<{
        action: string;
        risk_level: AuditPolicyRiskLevel;
        is_active: boolean;
        is_protected: boolean;
        updated_by_user_id: UserId | null;
        updated_at: Date;
        created_at: Date;
      }>
    >;
    findByAction: (action: string) => Promise<
      | {
          action: string;
          risk_level: AuditPolicyRiskLevel;
          is_active: boolean;
          is_protected: boolean;
          updated_by_user_id: UserId | null;
          updated_at: Date;
          created_at: Date;
        }
      | undefined
    >;
    upsert: (input: {
      action: string;
      risk_level: AuditPolicyRiskLevel;
      is_active: boolean;
      is_protected: boolean;
      updated_by_user_id: UserId | null;
      now: Date;
    }) => Promise<unknown>;
  };
}

export interface UpsertAuditPolicyInput {
  action: string;
  riskLevel: string;
  isActive: boolean;
  actorUserId: UserId;
  updatedAt: Date;
}

function mapPolicyRow(row: {
  action: string;
  risk_level: AuditPolicyRiskLevel;
  is_active: boolean;
  is_protected: boolean;
  updated_by_user_id: UserId | null;
  updated_at: Date;
  created_at: Date;
}): AuditActionPolicyItem {
  return {
    action: row.action,
    riskLevel: row.risk_level,
    isActive: row.is_active,
    isProtected: row.is_protected,
    updatedByUserId: row.updated_by_user_id,
    updatedAt: row.updated_at.getTime(),
    createdAt: row.created_at.getTime(),
  };
}

function parseRiskLevel(value: string): AuditPolicyRiskLevel {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  throw new Error("riskLevel is invalid");
}

function normalizeAction(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9._:-]{3,120}$/.test(normalized)) {
    throw new Error("action is invalid");
  }
  return normalized;
}

export function createAuditPolicyService(deps: AuditPolicyServiceDeps) {
  return {
    async getSnapshot(): Promise<AuditPolicySnapshot> {
      const items = await deps.auditActionPolicies.listAll();
      return {
        items: items.map(mapPolicyRow),
      };
    },

    async upsertPolicy(input: UpsertAuditPolicyInput): Promise<void> {
      const action = normalizeAction(input.action);
      const riskLevel = parseRiskLevel(input.riskLevel);
      const isActive = input.isActive;

      if (riskLevel === "high" && !isActive) {
        throw new Error("high risk policies must remain active");
      }

      const existing = await deps.auditActionPolicies.findByAction(action);
      if (existing?.is_protected) {
        if (!isActive) {
          throw new Error("protected policies cannot be disabled");
        }
        if (riskLevel !== "high") {
          throw new Error("protected policies cannot be downgraded");
        }
      }

      await deps.auditActionPolicies.upsert({
        action,
        risk_level: riskLevel,
        is_active: isActive,
        is_protected: existing?.is_protected ?? false,
        updated_by_user_id: input.actorUserId,
        now: input.updatedAt,
      });
    },
  };
}
