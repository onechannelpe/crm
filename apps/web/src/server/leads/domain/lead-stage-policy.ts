import type { LeadStage, LeadStatus, Prioridad } from "~/lib/db/types";

const REJECTED_STATUSES: LeadStatus[] = ["CARTERIZADO", "STOCK"];
const VALID_STATUSES: LeadStatus[] = ["DISPONIBLE", "SIN RESULTADO"];
const VALID_PRIORIDADES: Prioridad[] = ["P1", "P2"];

export function resolvePendingReviewStage(input: {
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: Prioridad | null;
}): LeadStage | null {
  if (input.stage !== "PENDING_EXTERNAL_REVIEW") return null;

  if (input.status !== null && REJECTED_STATUSES.includes(input.status)) {
    return "REJECTED_BY_STATUS";
  }

  if (input.prioridad === "SIN RESULTADO") {
    return "NEEDS_EXECUTIVE_INPUT";
  }

  if (
    input.status !== null &&
    VALID_STATUSES.includes(input.status) &&
    input.prioridad !== null &&
    VALID_PRIORIDADES.includes(input.prioridad)
  ) {
    return "READY_FOR_QUOTATION";
  }

  return null;
}

export const ALLOWED_LEAD_STAGE_TRANSITIONS: Partial<
  Record<LeadStage, LeadStage[]>
> = {
  REGISTERED: ["ENRICHING"],
  ENRICHING: ["PENDING_EXTERNAL_REVIEW"],
  PENDING_EXTERNAL_REVIEW: [
    "REJECTED_BY_STATUS",
    "NEEDS_EXECUTIVE_INPUT",
    "READY_FOR_QUOTATION",
  ],
  NEEDS_EXECUTIVE_INPUT: ["READY_FOR_QUOTATION"],
  READY_FOR_QUOTATION: ["QUOTED"],
  QUOTED: ["READY_FOR_SALE"],
  READY_FOR_SALE: ["CONVERTED"],
};

export function canTransitionLeadStage(
  from: LeadStage,
  to: LeadStage,
): boolean {
  return ALLOWED_LEAD_STAGE_TRANSITIONS[from]?.includes(to) ?? false;
}
