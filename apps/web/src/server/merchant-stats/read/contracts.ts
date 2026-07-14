// Shapes returned by the business-stats read model. Kept flat and
// serializable so server actions can hand them straight to the dashboards.

export interface BusinessStatsFilters {
  month?: string; // ISO first-of-month; scopes the seller view and totals
  branchId?: string;
  sellerUserId?: string;
  product?: string;
}

export interface MonthlyGpvPoint {
  month: string;
  gpv: number;
  trx: number;
}

export interface SellerPerformanceRow {
  sellerKey: string;
  sellerName: string;
  sellerUserId: string | null;
  branchName: string | null;
  gpv: number;
  projectedGpv: number;
  rucCount: number;
}

export interface CohortMonth {
  offset: number;
  gpv: number;
  trx: number;
}

export interface CohortGridRow {
  saleId: string;
  ruc: string;
  tradeName: string | null;
  serialNumber: string | null;
  product: string;
  saleMonth: string;
  sellerName: string | null;
  branchName: string | null;
  projectedGpv: number | null;
  last15dGpv: number | null;
  months: CohortMonth[];
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
  latestMonthGpv: number;
}

export interface DataQualitySummary {
  unmatchedRucs: number;
  accountsMissingSeller: number;
  accountsMissingProjected: number;
  serialMismatches: number;
}

export interface BusinessStatsFilterOptions {
  months: string[];
  branches: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string }>;
  products: string[];
}

export interface OrgMerchantStats {
  projectedGpv: number | null;
  devices: Array<{
    saleId: string;
    product: string;
    serialNumber: string | null;
    soldAt: string;
    last15dGpv: number | null;
  }>;
  monthly: MonthlyGpvPoint[];
}
