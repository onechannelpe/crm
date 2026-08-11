export const MERCHANT_PRODUCTS = [
  "CULQIFULL",
  "CULQILINK",
  "CULQIONLINE",
] as const;

export const GPV_MAX_MONTH_OFFSET = 3;

export const COHORT_OFFSETS: readonly number[] = Array.from(
  { length: GPV_MAX_MONTH_OFFSET + 1 },
  (_, offset) => offset,
);

export const ATTRIBUTION_METHODS = ["crm_owner", "manual", "none"] as const;
export type AttributionMethod = (typeof ATTRIBUTION_METHODS)[number];

export const ATTRIBUTION_CONFIDENCES = ["exact", "none"] as const;
export type AttributionConfidence = (typeof ATTRIBUTION_CONFIDENCES)[number];

const SETTLED_CONFIDENCES = new Set<AttributionConfidence>(["exact"]);

export function needsReview(confidence: AttributionConfidence): boolean {
  return !SETTLED_CONFIDENCES.has(confidence);
}

export const QUALITY_ISSUES = [
  "no_owner",
  "no_target",
  "serial_mismatch",
  "no_mesa",
] as const;
export type QualityIssue = (typeof QUALITY_ISSUES)[number];

export function isQualityIssue(value: string): value is QualityIssue {
  return QUALITY_ISSUES.some((issue) => issue === value);
}

export const DORMANT_AFTER_DAYS = 30;
