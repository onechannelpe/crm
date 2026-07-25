import type { CalendarDate, CalendarMonth } from "~/domain/time/calendar-date";

import type {
  AttributionConfidence,
  AttributionMethod,
  QualityIssue,
} from "./vocabulary";

export interface BookFilter {
  branchId?: string;
  sellerUserId?: string;
  month?: CalendarMonth;
  product?: string;
}

export interface Page {
  limit: number;
  offset: number;
}

export interface PublishedPage<Row> {
  publicationId: string | null;
  rows: Row[];
}

export interface ExecutiveGpvMerchantView {
  ruc: string;
  name: string;
  gpv: number;
  projectedGpv: number | null;
  lastTransactionAt: CalendarDate | null;
  leadId: string | null;
}

export interface ExecutiveGpvProgressView {
  cutDate: CalendarDate | null;
  month: CalendarMonth | null;
  merchants: ExecutiveGpvMerchantView[];
}

export interface GpvPoint {
  gpv: number;
  trx: number;
}

export type CohortOffset = number;

export interface AttainmentRow {
  id: string | null;
  label: string;
  sublabel: string | null;
  gpv: number;
  // Null means no attributed RUC has a target this month; zero is an explicit target.
  projectedGpv: number | null;
  rucCount: number;
  deviceCount: number;
}

export interface AttainmentCoverage {
  attributedGpv: number;
  totalGpv: number;
}

export interface Attainment {
  sellers: AttainmentRow[];
  branches: AttainmentRow[];
  coverage: AttainmentCoverage;
}

export interface CulqiUserGpvRow {
  culqiUserName: string | null;
  gpv: number;
  trx: number;
  deviceCount: number;
}

export interface CohortRampSeries {
  saleMonth: CalendarMonth;
  deviceCount: number;
  projectedGpv: number;
  points: Array<GpvPoint & { offset: CohortOffset }>;
}

export interface CohortSaleRow {
  saleId: string;
  merchantId: string;
  ruc: string;
  tradeName: string | null;
  serialNumber: string | null;
  product: string;
  saleMonth: CalendarMonth;
  soldAt: CalendarDate;
  activatedAt: CalendarDate | null;
  lastTransactionAt: CalendarDate | null;
  clientType: string | null;
  organizationId: string | null;
  sellerName: string | null;
  culqiUserName: string | null;
  branchName: string | null;
  projectedGpv: number | null;
  months: Array<GpvPoint & { offset: CohortOffset }>;
  m0Plus15d: GpvPoint | null;
}

export interface MerchantDevice {
  saleId: string;
  product: string;
  serialNumber: string | null;
  soldAt: CalendarDate;
  m0Plus15dGpv: number | null;
}

export interface RucMerchantStats {
  projectedGpv: number | null;
  devices: MerchantDevice[];
  monthlyGpv: Array<GpvPoint & { month: CalendarMonth }>;
  sellerName: string | null;
}

export interface LifecycleSummary {
  salesTotal: number;
  activatedCount: number;
  medianDaysToActivate: number | null;
  dormantCount: number;
  dormantThresholdDays: number;
}

export type QualitySummary = Record<QualityIssue, number>;

export type GpvPerformanceView =
  | { kind: "empty" }
  | {
      kind: "ready";
      month: CalendarMonth;
      attainment: Attainment;
      lifecycle: LifecycleSummary;
      ramp: CohortRampSeries[];
      quality: QualitySummary;
    };

export type GpvCulqiView =
  | { kind: "empty" }
  | {
      kind: "ready";
      month: CalendarMonth;
      rows: CulqiUserGpvRow[];
    };

export interface QualityRow {
  ruc: string;
  month: CalendarMonth;
  organizationName: string | null;
  tradeName: string | null;
  sellerName: string | null;
  culqiUserName: string | null;
  gpvAtStake: number;
  method: AttributionMethod;
  confidence: AttributionConfidence;
  detail: string;
  evidence: unknown;
}

export interface FilterOptions {
  branches: Array<{ id: string; name: string }>;
  sellers: Array<{ userId: string; name: string }>;
  months: CalendarMonth[];
  products: string[];
}
