// Shapes the merchant GPV read model returns. The UI imports these; it must
// never reach into ~/server for a type.

import type {
  AttributionConfidence,
  AttributionMethod,
  QualityIssue,
} from "./vocabulary";

// Real slices of the book. Credit lives on (ruc, month), so branch and seller
// select against attribution; month and product are per-grain and each query
// applies them to its own column.
export interface BookFilter {
  branchId?: string;
  sellerUserId?: string;
  month?: string;
  product?: string;
}

export interface Page {
  limit: number;
  offset: number;
}

export interface GpvPoint {
  gpv: number;
  trx: number;
}

// 0..3, matching gpv_m0..gpv_m3. GPV_MAX_MONTH_OFFSET owns the bound.
export type CohortOffset = number;

// Attainment for one seller or zone in a single calendar month. gpv and
// projected stay separate so the caller can render the ratio and the magnitudes.
// Both are summed over the same (ruc, month) rows, so they always describe the
// same population.
//
// The row whose userId is null is the unassigned bucket, and it is permanent:
// every RUC-month the ladder could not settle lands there. It is not an error
// state and must stay visible -- see AttainmentCoverage.
export interface AttainmentRow {
  // The seller's user id on a seller row, the branch id on a zone row, and null
  // on the unassigned bucket of either. Opaque to the UI except that a seller
  // row's id is what BookFilter.sellerUserId takes.
  id: string | null;
  label: string;
  sublabel: string | null;
  gpv: number;
  projectedGpv: number;
  rucCount: number;
  deviceCount: number;
}

// How much of the month's volume the leaderboard above actually accounts for.
// A leaderboard without this is a lie by omission: unattributed GPV is a
// steady state, and its size decides whether the ranking means anything.
export interface AttainmentCoverage {
  attributedGpv: number;
  totalGpv: number;
}

export interface Attainment {
  sellers: AttainmentRow[];
  branches: AttainmentRow[];
  coverage: AttainmentCoverage;
}

// GPV by Culqi's own usuario (cod_vendedor / vendedor). A reconciliation axis,
// NOT a leaderboard: the usuario matched the real seller 0% of the time across
// the sample, so ranking people by it would be actively wrong. It exists so the
// book can be squared against Culqi's own reporting.
//
// Sale grain, not (ruc, month): a RUC's devices can carry different usuarios.
export interface CulqiUserGpvRow {
  culqiUserName: string | null;
  gpv: number;
  trx: number;
  deviceCount: number;
}

// One line of the ramp curve: a sale-month cohort across its own months.
// Points stop where the data does.
export interface CohortRampSeries {
  saleMonth: string;
  deviceCount: number;
  projectedGpv: number;
  points: Array<GpvPoint & { offset: CohortOffset }>;
}

// One sale's cohort measures. m0Plus15d is cumulative and overlaps months[0],
// so it is kept apart from the per-month series: the two cannot share an axis.
export interface CohortSaleRow {
  saleId: string;
  ruc: string;
  tradeName: string | null;
  serialNumber: string | null;
  product: string;
  saleMonth: string;
  soldAt: string;
  activatedAt: string | null;
  lastTransactionAt: string | null;
  clientType: string | null;
  organizationId: string | null;
  sellerName: string | null;
  culqiUserName: string | null;
  branchName: string | null;
  // The RUC's recurring monthly projection, as of the sale month. Not a total to
  // be summed across months.
  projectedGpv: number | null;
  months: Array<GpvPoint & { offset: CohortOffset }>;
  m0Plus15d: GpvPoint | null;
}

export interface MerchantDevice {
  saleId: string;
  product: string;
  serialNumber: string | null;
  soldAt: string;
  m0Plus15dGpv: number | null;
}

export interface RucMerchantStats {
  // The projection in force for the newest month this RUC realized, which is
  // what the gauge measures that month's GPV against.
  projectedGpv: number | null;
  devices: MerchantDevice[];
  // Calendar months. A May device's m1 plus a June device's m0 is that RUC's
  // real June volume across its devices, and the projection is a per-RUC monthly
  // number measured against exactly this.
  monthlyGpv: Array<GpvPoint & { month: string }>;
  sellerName: string | null;
}

// Lifecycle signals derived from columns the source has always carried.
export interface LifecycleSummary {
  salesTotal: number;
  activatedCount: number;
  // Null when no activated sale carries a sale date to measure against.
  medianDaysToActivate: number | null;
  dormantCount: number;
  dormantThresholdDays: number;
}

export type QualitySummary = Record<QualityIssue, number>;

// One row of a Calidad de datos queue, ordered by the GPV it would move.
// With a permanent queue, prioritisation is the feature: resolving the S/800k
// merchant matters more than the S/5k one.
export interface QualityRow {
  ruc: string;
  month: string;
  organizationName: string | null;
  tradeName: string | null;
  sellerName: string | null;
  // Culqi's usuario for this RUC-month. Never evidence the ladder may use, but
  // the best hint a human has when deciding who really sold it.
  culqiUserName: string | null;
  // What resolving this row would move into (or out of) someone's book.
  gpvAtStake: number;
  method: AttributionMethod;
  confidence: AttributionConfidence;
  detail: string;
  evidence: unknown;
}

export interface FilterOptions {
  branches: Array<{ id: string; name: string }>;
  sellers: Array<{ userId: string; name: string }>;
  months: string[];
  products: string[];
}
