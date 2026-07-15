import { normalizeCsvHeader } from "~/server/csv/core";

// Canonical (accent-stripped, snake_cased) header names that normalizeGpvHeader
// maps source columns onto.
//
// The only input is the raw dealer export (planning-report__dealer-*.xlsx). The
// team's hand-edited "GPV AL" workbook is not an input: it carried ZONAL /
// VENDEDOR R / PROYECTADO columns typed by a human, and replacing that manual
// step is the point of this pipeline.
export const GPV_COLUMNS = {
  saleMonth: "anomes_vta",
  ruc: "identificador_tributario",
  merchantId: "id_merchant",
  serial: "num_serie",
  product: "producto",
  soldAt: "fecha_venta",
  tradeName: "nbr_comercial",
  legalName: "nbr_razon_social",
  // Culqi's "usuario": who the sale was registered under at Culqi. Reference
  // and reconciliation only, never the real seller.
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
} as const;

// Minimal set that marks a worksheet as a GPV report.
export const GPV_REQUIRED_HEADERS = [
  GPV_COLUMNS.saleMonth,
  GPV_COLUMNS.ruc,
  GPV_COLUMNS.merchantId,
  GPV_COLUMNS.product,
  GPV_COLUMNS.soldAt,
  "gpv_m0",
] as const;

export function normalizeGpvHeader(raw: string): string {
  return normalizeCsvHeader(raw.replace(/^﻿/, ""));
}

export function headerSetHasAll(
  headers: readonly string[],
  required: readonly string[],
): boolean {
  const set = new Set(headers);
  return required.every((header) => set.has(header));
}
