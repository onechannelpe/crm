import { asUserId, isUserId, type UserId } from "~/server/shared/ids";
import type { createAuditActionPoliciesRepo } from "~/server/shared/repos-audit-action-policies";

import type {
  AuditActionPolicyItem,
  AuditPolicyRiskLevel,
  AuditPolicySnapshot,
} from "./contracts";

interface AuditPolicyServiceDeps {
  auditActionPolicies: ReturnType<typeof createAuditActionPoliciesRepo>;
}

export interface UpsertAuditPolicyInput {
  action: string;
  riskLevel: string;
  isActive: boolean;
  actorUserId: UserId;
}

function mapPolicyRow(row: {
  action: string;
  risk_level: AuditPolicyRiskLevel;
  is_active: number;
  is_protected: number;
  updated_by_user_id: string | null;
  updated_at: number;
  created_at: number;
}): AuditActionPolicyItem {
  if (row.updated_by_user_id !== null && !isUserId(row.updated_by_user_id)) {
    throw new Error("audit policy row has invalid updated_by_user_id");
  }
  return {
    action: row.action,
    riskLevel: row.risk_level,
    isActive: row.is_active === 1,
    isProtected: row.is_protected === 1,
    updatedByUserId:
      row.updated_by_user_id === null ? null : asUserId(row.updated_by_user_id),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
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
      if (existing?.is_protected === 1) {
        if (!isActive) {
          throw new Error("protected policies cannot be disabled");
        }
        if (riskLevel !== "high") {
          throw new Error("protected policies cannot be downgraded");
        }
      }

      const now = Date.now();
      await deps.auditActionPolicies.upsert({
        action,
        risk_level: riskLevel,
        is_active: isActive ? 1 : 0,
        is_protected: existing?.is_protected ?? 0,
        updated_by_user_id: input.actorUserId,
        now,
      });
    },
  };
}
