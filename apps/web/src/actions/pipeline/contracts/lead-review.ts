export const LEAD_REVIEW_STATUSES = [
  "DISPONIBLE",
  "SIN RESULTADO",
  "CARTERIZADO",
  "STOCK",
] as const;

export const LEAD_REVIEW_PRIORITIES = ["P1", "P2", "SIN RESULTADO"] as const;

export type LeadReviewStatus = (typeof LEAD_REVIEW_STATUSES)[number];
export type LeadReviewPriority = (typeof LEAD_REVIEW_PRIORITIES)[number];
