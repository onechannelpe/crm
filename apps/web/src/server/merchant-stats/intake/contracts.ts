import { normalizeCsvHeader } from "~/server/csv/core";

// Canonical (accent-stripped, snake_cased) header names that normalizeCsvHeader
// maps source columns onto.
export const GPV_COLUMNS = {
  saleMonth: "anomes_vta",
  ruc: "identificador_tributario",
  merchantId: "id_merchant",
  serial: "num_serie",
  product: "producto",
  soldAt: "fecha_venta",
  soldAtAlt: "fecha",
  tradeName: "nbr_comercial",
  legalName: "nbr_razon_social",
  // culqiUserCode/Name is the seller the sale was registered under at Culqi
  // (the "usuario"). Not the real seller: that lives in merchant_accounts
  // under realSeller. The culqiUser prefix keeps the two readable as distinct.
  culqiUserCode: "cod_vendedor",
  culqiUserName: "vendedor",
  mesa: "mesa",
  channel: "canal",
  subchannel: "subcanal",
  offer: "oferta",
  promotion: "promocion",
  clientType: "tipo_cliente",
  stockType: "cliente",
  trialAt: "dia_prueba",
  activatedAt: "dia_activo",
  lastTransactionAt: "ultima_trx",
  // Cumulative, sale month + first 15d of m1. Overlaps m0; never joins the
  // m0..m3 series.
  m0Plus15dGpv: "gpv_m0_15d",
  m0Plus15dTrx: "trx_m0_15d",
  // Enrichment columns, present only in the team-maintained "GPV AL" file.
  zonal: "zonal",
  realSeller: "vendedor_r",
  projected: "proyectado",
} as const;

// Minimal set that marks a worksheet as a GPV report. fecha_venta is left
// out because the enriched file names the sale date `fecha`; añomes_vta is
// the reliable anchor and is present in both.
export const GPV_REQUIRED_HEADERS = [
  GPV_COLUMNS.saleMonth,
  GPV_COLUMNS.ruc,
  GPV_COLUMNS.merchantId,
  GPV_COLUMNS.product,
  "gpv_m0",
] as const;

export const GPV_ENRICHMENT_HEADERS = [
  GPV_COLUMNS.zonal,
  GPV_COLUMNS.realSeller,
  GPV_COLUMNS.projected,
] as const;

// gpv_m0..gpv_m3 / trx_m0..trx_m3.
export const GPV_MAX_MONTH_OFFSET = 3;

export const MERCHANT_PRODUCTS = [
  "CULQIFULL",
  "CULQILINK",
  "CULQIONLINE",
] as const;

export type GpvCellValue = string | number | Date | boolean | null | undefined;

export type GpvRawRecord = Record<string, string>;

export interface GpvMetricInput {
  monthOffset: number;
  month: string; // ISO date, first day of the calendar month
  gpv: number;
  trx: number;
}

export interface MappedGpvRow {
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
  metrics: GpvMetricInput[];
  realSellerName: string | null;
  zonal: string | null;
  projectedGpv: number | null;
  raw: GpvRawRecord;
}

export interface InvalidGpvRow {
  rowNumber: number;
  ruc: string;
  merchantId: string | null;
  serialNumber: string | null;
  reason: string;
  raw: GpvRawRecord;
}

export interface ParsedGpvReport {
  cutDate: string; // ISO date, inferred max(ultima_trx)
  hasEnrichment: boolean;
  validRows: MappedGpvRow[];
  invalidRows: InvalidGpvRow[];
}

export function normalizeGpvHeader(raw: string): string {
  return normalizeCsvHeader(raw.replace(/^﻿/, ""));
}

// The durable sale identity, matching the (merchant_id, product,
// coalesce(serial_number,'')) unique index. Used to map upsert results back to
// their source rows and to dedupe a batch before the multi-row upsert.
//
// NUL is the separator: no source cell carries one, so an id cannot
// accidentally contain it.
const KEY_SEPARATOR = "\u0000";

export function saleIdentityKey(
  merchantId: string,
  product: string,
  serialNumber: string | null,
): string {
  return [merchantId, product, serialNumber ?? ""].join(KEY_SEPARATOR);
}

export function headerSetHasAll(
  headers: readonly string[],
  required: readonly string[],
): boolean {
  const set = new Set(headers);
  return required.every((h) => set.has(h));
}
