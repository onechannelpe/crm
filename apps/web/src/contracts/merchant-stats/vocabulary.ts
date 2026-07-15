// Closed value domains for the merchant GPV pipeline, shared by the server, the
// actions and the UI. Nothing here imports from a layer; every layer imports it.

export const MERCHANT_PRODUCTS = [
  "CULQIFULL",
  "CULQILINK",
  "CULQIONLINE",
] as const;

// gpv_m0..gpv_m3 / trx_m0..trx_m3. The single owner of the offset bound.
export const GPV_MAX_MONTH_OFFSET = 3;

// The cohort axis, derived from the bound so a wider source file cannot leave a
// hardcoded [0,1,2,3] behind.
export const COHORT_OFFSETS: readonly number[] = Array.from(
  { length: GPV_MAX_MONTH_OFFSET + 1 },
  (_, offset) => offset,
);

// How a month's credit was decided. Every rung is CRM evidence: the dealer file
// names a Culqi usuario, but that usuario is not the seller, so the file never
// decides credit. `manual` is terminal -- an import never overwrites it.
export const ATTRIBUTION_METHODS = [
  "serial",
  "ruc_lead",
  "manual",
  "none",
] as const;
export type AttributionMethod = (typeof ATTRIBUTION_METHODS)[number];

// How much the verdict can be trusted. Everything except `exact` and `inferred`
// is a work item for the sales manager.
export const ATTRIBUTION_CONFIDENCES = [
  "exact",
  "inferred",
  "conflict",
  "late",
  "none",
] as const;
export type AttributionConfidence = (typeof ATTRIBUTION_CONFIDENCES)[number];

const SETTLED_CONFIDENCES = new Set<AttributionConfidence>([
  "exact",
  "inferred",
]);

// Everything else is a queue: a verdict the ladder could not settle on its own.
// This is a steady state, not a backlog. The CRM will never have a lead or a
// serial for every RUC the dealer sells to, so `none` is a normal outcome and
// the queue is an operational surface rather than a migration to finish.
export function needsReview(confidence: AttributionConfidence): boolean {
  return !SETTLED_CONFIDENCES.has(confidence);
}

// The Calidad de datos queues. The first three are a confidence value on the row
// itself, named identically on both sides; the last two are cross-checks that no
// single row can carry.
export const QUALITY_ISSUES = [
  "conflict",
  "late",
  "none",
  "no_target",
  "serial_mismatch",
] as const;
export type QualityIssue = (typeof QUALITY_ISSUES)[number];

export function isQualityIssue(value: string): value is QualityIssue {
  return QUALITY_ISSUES.some((issue) => issue === value);
}

// A merchant that has not transacted in this long reads as dormant. Chosen
// longer than a month so a merchant who simply bills late is not flagged.
export const DORMANT_AFTER_DAYS = 30;
