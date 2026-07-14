// Shapes returned by the merchant GPV read model.
// The cohort is the grain. The source reports only m0..m3 per sale.

// A real seller is a user when the name resolves, free text otherwise.
// The key is the user id when there is one and a label sentinel when there
// is not; sellerKeyOf is the only place this shape is constructed.
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

// Real slices of the book. Month is absent (it is the cohort axis). Product
// is absent from analytics (a count measure, "POS / LINK"), available to
// record surfaces where a reader is hunting specific rows.
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

// One sale's cohort measures. m0Plus15d is cumulative and overlaps months[0],
// so it is kept apart from the per-month series: the two cannot share an axis.
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

// One line of the ramp curve: a sale-month cohort across its own months.
// Points stop where the data does.
export interface CohortRampSeries {
  saleMonth: string;
  deviceCount: number;
  projectedGpv: number;
  points: Array<GpvPoint & { offset: CohortOffset }>;
}

// Attainment for one seller or zone at a single cohort step. gpv and
// projected stay separate so the caller can render the ratio and magnitudes.
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
// dashboards never read.
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
  // Includes label-only sellers ("EMPRESA", unmatched names) so the seller
  // control can select them. An inner join to users would drop them.
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
  // at the book grain. A May device's m1 plus a June device's m0 is that RUC's
  // real June volume across its devices, and projectedGpv is a per-RUC monthly
  // target measured against exactly this.
  monthlyGpv: Array<GpvPoint & { month: string }>;
}
