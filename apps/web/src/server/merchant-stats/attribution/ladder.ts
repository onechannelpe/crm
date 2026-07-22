import type {
  AttributionConfidence,
  AttributionMethod,
} from "~/contracts/merchant-stats/vocabulary";
import type { BranchId, UserId, WorkflowLeadId } from "~/server/shared/ids";

export interface SaleEvidence {
  soldAt: string;
  culqiUserName: string | null;
  serial: {
    userId: UserId;
    leadId: WorkflowLeadId;
  } | null;
}

export interface RucLeadEvidence {
  userId: UserId;
  leadId: WorkflowLeadId;
  createdAt: string;
}

export interface MonthInput {
  sales: readonly SaleEvidence[];
  // Every sale belongs to the same RUC and therefore shares this lead.
  rucLead: RucLeadEvidence | null;
}

export interface MonthEvidence {
  serialUserIds: UserId[];
  rucLead: {
    userId: UserId;
    leadId: WorkflowLeadId;
    createdAt: string;
    postdatesASale: boolean;
  } | null;
  culqiUserNames: string[];
  contenders: UserId[];
}

export interface AttributionVerdict {
  sellerUserId: UserId | null;
  branchId: BranchId | null;
  method: AttributionMethod;
  confidence: AttributionConfidence;
  evidence: MonthEvidence;
}

// Assign the month only when its evidence identifies one seller.
export function attributeMonth(
  month: MonthInput,
  branchOf: (userId: UserId) => BranchId | null,
): AttributionVerdict {
  const { sales, rucLead } = month;

  const serialUserIds = distinct(
    sales.flatMap((sale) => (sale.serial ? [sale.serial.userId] : [])),
  );

  const postdatesASale =
    rucLead !== null &&
    sales.some((sale) => rucLead.createdAt.slice(0, 10) > sale.soldAt);

  const evidence: MonthEvidence = {
    serialUserIds,
    rucLead:
      rucLead === null
        ? null
        : {
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
    branchId: sellerUserId === null ? null : branchOf(sellerUserId),
    method,
    confidence,
    evidence,
  });

  if (serialUserIds.length > 1) {
    evidence.contenders = serialUserIds;

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

  if (rucLead !== null) {
    return decide(null, "none", "late");
  }

  return decide(null, "none", "none");
}

function distinct<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
