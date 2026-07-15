import type {
  AttributionConfidence,
  AttributionMethod,
} from "~/contracts/merchant-stats/vocabulary";
import type { BranchId, UserId, WorkflowLeadId } from "~/server/shared/ids";

// What the CRM knows about one device that realized GPV in the month being
// decided.
export interface SaleEvidence {
  soldAt: string;
  // Culqi's usuario. Recorded for the reviewer and never read by the rules
  // below: measured against the team's hand-kept column it named the real seller
  // 0% of the time, and the same usuario maps to different real sellers, so it
  // carries no signal a verdict may rest on.
  culqiUserName: string | null;
  // The CRM delivered this exact device: num_serie matched a serial the
  // fulfillment flow recorded by hand. The strongest claim available.
  serial: { userId: UserId; leadId: WorkflowLeadId } | null;
  // The RUC resolves to an organization with a live lead. A property of the RUC,
  // so every sale of it carries the same one.
  rucLead: { userId: UserId; leadId: WorkflowLeadId; createdAt: string } | null;
}

// Everything the ladder found, kept for whoever has to judge the row later.
export interface MonthEvidence {
  serialUserIds: string[];
  rucLead: {
    userId: string;
    leadId: string;
    createdAt: string;
    // True when the lead was opened after at least one of the devices whose
    // volume lands in this month.
    postdatesASale: boolean;
  } | null;
  culqiUserNames: string[];
  // Who claimed the month when the rungs disagreed. Empty otherwise.
  contenders: string[];
}

export interface AttributionVerdict {
  sellerUserId: UserId | null;
  branchId: BranchId | null;
  method: AttributionMethod;
  confidence: AttributionConfidence;
  evidence: MonthEvidence;
}

// Decides who gets credit for one RUC-month from the evidence alone.
//
// The grain is the month, not the sale, and the signature says so: a RUC-month
// is decided once, from every device whose volume lands in it. Deciding per
// device and keeping the first answer is how two devices sold by different
// people used to resolve to a silent coin flip.
//
// Anything the ladder cannot settle becomes a work item rather than a guess,
// because a wrong seller on a comp-relevant number is worse than a blank one.
// Blanks are permanent and expected: the CRM will never hold a lead or a serial
// for every RUC the dealer sells to.
export function attributeMonth(
  sales: readonly SaleEvidence[],
  branchOf: (userId: UserId) => BranchId | null,
): AttributionVerdict {
  const serialUserIds = distinct(
    sales.flatMap((sale) => (sale.serial ? [sale.serial.userId] : [])),
  );
  const rucLead = sales.find((sale) => sale.rucLead !== null)?.rucLead ?? null;

  // Conservative: the lead claims the month only if it predates every device
  // whose volume lands in it. Predating some but not others is a mixed month,
  // and (ruc, month) cannot express partial credit -- so a human decides.
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

  // Two devices on the same RUC-month fulfilled by different people. One of the
  // two records is about the wrong device; never guess between them.
  if (serialUserIds.length > 1) {
    evidence.contenders = [...serialUserIds];
    return decide(null, "none", "conflict");
  }

  const claimingLead = rucLead !== null && !postdatesASale ? rucLead : null;
  const serialUserId = serialUserIds[0] ?? null;

  if (serialUserId !== null) {
    // The serial and the live lead name different people. Same rule: no guess.
    if (claimingLead !== null && claimingLead.userId !== serialUserId) {
      evidence.contenders = [serialUserId, claimingLead.userId];
      return decide(null, "none", "conflict");
    }
    return decide(serialUserId, "serial", "exact");
  }

  if (claimingLead !== null) {
    return decide(claimingLead.userId, "ruc_lead", "inferred");
  }

  // A lead exists but was opened after a device it would be claiming volume for.
  // Link the org, withhold the credit: this is what stops a late registration
  // inheriting old GPV. A human can still hand it over.
  if (rucLead !== null) return decide(null, "none", "late");

  return decide(null, "none", "none");
}

function distinct<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
