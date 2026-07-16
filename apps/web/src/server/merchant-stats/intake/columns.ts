import { normalizeCsvHeader } from "~/server/csv/core";

// Dealer export headers.
export const GPV_COLUMNS = {
  saleMonth: "anomes_vta",
  ruc: "identificador_tributario",
  merchantId: "id_merchant",
  serial: "num_serie",
  product: "producto",
  soldAt: "fecha_venta",
  tradeName: "nbr_comercial",
  legalName: "nbr_razon_social",
  // Culqi's registered usuario IS NOT the registered seller in the crm.
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
