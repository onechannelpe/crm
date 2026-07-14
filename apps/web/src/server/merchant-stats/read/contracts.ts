// Shapes returned by the merchant GPV read model. Kept flat and serializable so
// server actions can hand them straight to the dashboards.
//
// The cohort is the grain. Every sale belongs to the month it was sold in, and
// its metrics are indexed off that month: m0 is the sale month, m1 the next
// calendar month, and so on. There is deliberately no calendar-month series
// here: the source reports only m0..m3 per sale, so any calendar total silently
// drops every older cohort still transacting. See business-stats-plan.txt §4.

// A real seller is a CRM user when the name resolves, and free text otherwise
// ("EMPRESA", or a name we could not match). Both must be selectable, so the
// key is the user id when there is one and a label sentinel when there is not.
// sellerKeyOf is the only place this shape is constructed.
export type SellerKey = string;

export function sellerKeyOf(
  userId: string | null,
  label: string | null,
): SellerKey {
  return userId ?? `label:${label ?? "—"}`;
}

export function parseSellerKey(
  key: SellerKey,
): { kind: "user"; userId: string } | { kind: "label"; label: string } {
  return key.startsWith("label:")
    ? { kind: "label", label: key.slice("label:".length) }
    : { kind: "user", userId: key };
}

// The dimensions that are real slices of the book. Month is absent on purpose:
// it is the cohort axis, not a filter. Product is absent from analytics for the
// same reason (it is a count measure, "POS / LINK"), but stays available to the
// record surfaces where a reader is looking for specific rows.
export interface CohortFilters {
  branchId?: string;
  sellerKey?: SellerKey;
}

export interface RecordFilters extends CohortFilters {
  saleMonth?: string;
  product?: string;
}

export interface GpvPoint {
  gpv: number;
  trx: number;
}

// 0..3, matching gpv_m0..gpv_m3. GPV_MAX_MONTH_OFFSET owns the bound.
export type CohortOffset = number;

// One sale's cohort measures. m0Plus15d is cumulative (the sale month plus the
// first 15 days of m1) and overlaps months[0], so it is kept apart from the
// per-month series rather than appended to it: they cannot share an axis.
export interface CohortMeasures {
  months: Array<GpvPoint & { offset: CohortOffset }>;
  m0Plus15d: GpvPoint | null;
}

export interface CohortSaleRow extends CohortMeasures {
  saleId: string;
  ruc: string;
  tradeName: string | null;
  serialNumber: string | null;
  product: string;
  saleMonth: string;
  organizationId: string | null;
  realSellerName: string | null;
  branchName: string | null;
  // The RUC's recurring monthly target. Each cohort month is measured against
  // it, so it is not a total to be summed across months.
  projectedGpv: number | null;
  soldAt: string;
  activatedAt: string | null;
  lastTransactionAt: string | null;
  clientType: string | null;
}

// One line of the ramp curve: how a sale-month cohort performed across its own
// months. Points stop where the data does, so a young cohort is a short line
// rather than a line that dives to zero.
export interface CohortRampSeries {
  saleMonth: string;
  deviceCount: number;
  projectedGpv: number;
  points: Array<GpvPoint & { offset: CohortOffset }>;
}

// Attainment for one seller or zone, at a single cohort step. gpv and projected
// stay separate so the caller can render the ratio and the magnitudes.
export interface AttainmentRow {
  key: string;
  label: string;
  sublabel: string | null;
  // Present when the row resolves to a CRM record worth linking to.
  userId: string | null;
  gpv: number;
  projectedGpv: number;
  deviceCount: number;
}

// Lifecycle signals derived from columns the source has always carried and the
// dashboards never read: dia_activo, dia_prueba, ultima_trx.
export interface LifecycleSummary {
  salesTotal: number;
  activatedCount: number;
  // Null when no activated sale carries a sale date to measure against.
  medianDaysToActivate: number | null;
  dormantCount: number;
  dormantThresholdDays: number;
}

export interface MerchantAccountRow {
  ruc: string;
  organizationId: string | null;
  organizationName: string | null;
  realSellerUserId: string | null;
  realSellerName: string | null;
  branchId: string | null;
  branchName: string | null;
  projectedGpv: number | null;
  salesCount: number;
  // The most recent cohort month this RUC sold in, so the queue can be read
  // newest-first without a second query.
  latestSaleMonth: string | null;
}

export interface DataQualitySummary {
  unmatchedRucs: number;
  accountsMissingSeller: number;
  accountsMissingProjected: number;
  accountsMissingBranch: number;
  serialMismatches: number;
}

export interface MerchantStatsFilterOptions {
  branches: Array<{ id: string; name: string }>;
  // Includes label-only sellers ("EMPRESA", unmatched names). The previous
  // inner join to users dropped them, which made a third of the book
  // unreachable from the seller control.
  sellers: Array<{ key: SellerKey; name: string }>;
  saleMonths: string[];
  products: string[];
}

export interface OrgMerchantStats {
  projectedGpv: number | null;
  devices: Array<{
    saleId: string;
    product: string;
    serialNumber: string | null;
    soldAt: string;
    m0Plus15dGpv: number | null;
  }>;
  // Calendar months, which are honest at the RUC grain even though they are not
  // at the book grain. One RUC's month total is the sum of what its own sales
  // reported for that month: a May device's m1 plus a June device's m0 is that
  // RUC's real June volume across its devices, and projectedGpv is a per-RUC
  // monthly target measured against exactly this. The book total cannot be built
  // this way because it would drop every cohort whose m0..m3 window has closed;
  // one RUC's window is just its own coverage, not a silent omission.
  monthlyGpv: Array<GpvPoint & { month: string }>;
}
