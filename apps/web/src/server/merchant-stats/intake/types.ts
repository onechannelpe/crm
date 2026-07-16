export type GpvCellValue = string | number | Date | boolean | null | undefined;

export type GpvRawRecord = Record<string, string>;

export interface GpvObservation {
  offset: number;
  gpv: number;
  trx: number;
}

export interface SourceRow {
  rowNumber: number;
  ruc: string;
  merchantId: string;
  serialNumber: string | null;
  product: string;
  soldAt: string; // ISO date
  saleMonth: string; // ISO date, first of month
  tradeName: string | null;
  legalName: string | null;
  culqiUserCode: string | null;
  culqiUserName: string | null;
  mesa: string | null;
  channel: string | null;
  subchannel: string | null;
  offerAmount: number | null;
  promotion: string | null;
  clientType: string | null;
  stockType: string | null;
  trialAt: string | null;
  activatedAt: string | null;
  lastTransactionAt: string | null;
  m0Plus15dGpv: number | null;
  m0Plus15dTrx: number | null;
  gpv: GpvObservation[];
  raw: GpvRawRecord;
}

export interface Rejection {
  rowNumber: number;
  ruc: string | null;
  merchantId: string | null;
  serialNumber: string | null;
  reason: string;
  raw: GpvRawRecord;
}

export interface ParsedReport {
  rows: SourceRow[];
  rejections: Rejection[];
}
