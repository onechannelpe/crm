import type {
  AttributionConfidence,
  AttributionMethod,
} from "~/contracts/merchant-stats/vocabulary";
import type { BranchId, UserId, WorkflowLeadId } from "~/server/shared/ids";

export interface SaleEvidence {
  soldAt: string;
  culqiUserName: string | null;
  serial: { userId: UserId; leadId: WorkflowLeadId } | null;
  rucLead: { userId: UserId; leadId: WorkflowLeadId; createdAt: string } | null;
}

export interface MonthEvidence {
  serialUserIds: string[];
  rucLead: {
    userId: string;
    leadId: string;
    createdAt: string;
    postdatesASale: boolean;
  } | null;
  culqiUserNames: string[];
  contenders: string[];
}

export interface AttributionVerdict {
  sellerUserId: UserId | null;
  branchId: BranchId | null;
  method: AttributionMethod;
  confidence: AttributionConfidence;
  evidence: MonthEvidence;
}

// Credit a RUC-month only when its device evidence names one seller. Conflicting
// or late crm evidence remains unassigned for a manager to resolve.
export function attributeMonth(
  sales: readonly SaleEvidence[],
  branchOf: (userId: UserId) => BranchId | null,
): AttributionVerdict {
  const serialUserIds = distinct(
    sales.flatMap((sale) => (sale.serial ? [sale.serial.userId] : [])),
  );
  const rucLead = sales.find((sale) => sale.rucLead !== null)?.rucLead ?? null;

  // A lead opened after any contributing sale cannot claim this whole month.
  const postdatesASale =
    rucLead !== null &&
    sales.some((sale) => rucLead.createdAt.slice(0, 10) > sale.soldAt);

  const evidence: MonthEvidence = {
    serialUserIds: [...serialUserIds],
    rucLead: rucLead && {
      userId: rucLead.userId,
      leadId: rucLead.leadId,
      createdAt: rucLead.createdAt,
      postdatesASale,
    },
    culqiUserNames: distinct(
      sales.flatMap((sale) => (sale.culqiUserName ? [sale.culqiUserName] : [])),
    ),
    contenders: [],
  };

  const decide = (
    sellerUserId: UserId | null,
    method: AttributionMethod,
    confidence: AttributionConfidence,
  ): AttributionVerdict => ({
    sellerUserId,
    branchId: sellerUserId ? branchOf(sellerUserId) : null,
    method,
    confidence,
    evidence,
  });

  if (serialUserIds.length > 1) {
    evidence.contenders = [...serialUserIds];
    return decide(null, "none", "conflict");
  }

  const claimingLead = rucLead !== null && !postdatesASale ? rucLead : null;
  const serialUserId = serialUserIds[0] ?? null;

  if (serialUserId !== null) {
    if (claimingLead !== null && claimingLead.userId !== serialUserId) {
      evidence.contenders = [serialUserId, claimingLead.userId];
      return decide(null, "none", "conflict");
    }
    return decide(serialUserId, "serial", "exact");
  }

  if (claimingLead !== null) {
    return decide(claimingLead.userId, "ruc_lead", "inferred");
  }

  if (rucLead !== null) return decide(null, "none", "late");

  return decide(null, "none", "none");
}

function distinct<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
