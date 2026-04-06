import type { LeadHistoryEntry } from "~/server/pipeline/domain/history";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { HistoryEventRow } from "./history-event-row";
import { toHistoryEntryBase } from "./history-event-row";
import {
  requireCurrency,
  requireNumber,
  requireString,
} from "./history-payload-fields";

export function toCommercialInputEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const proveedorActual = requireString(payload, "proveedorActual", row);
  if (!proveedorActual.ok) return proveedorActual;

  const tasaActual = requireNumber(payload, "tasaActual", row);
  if (!tasaActual.ok) return tasaActual;

  const gpv = requireNumber(payload, "gpv", row);
  if (!gpv.ok) return gpv;

  const ticket = requireNumber(payload, "ticket", row);
  if (!ticket.ok) return ticket;

  const abono = requireNumber(payload, "abono", row);
  if (!abono.ok) return abono;

  const cantidadPos = requireNumber(payload, "cantidadPos", row);
  if (!cantidadPos.ok) return cantidadPos;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "commercial_input_completed",
    payload: {
      proveedorActual: proveedorActual.value,
      tasaActual: tasaActual.value,
      gpv: gpv.value,
      ticket: ticket.value,
      abono: abono.value,
      cantidadPos: cantidadPos.value,
    },
  });
}

export function toQuotationEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const quotationId = requireNumber(payload, "quotationId", row);
  if (!quotationId.ok) return quotationId;

  const version = requireNumber(payload, "version", row);
  if (!version.ok) return version;

  const moneda = requireCurrency(payload, row);
  if (!moneda.ok) return moneda;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "quotation_created",
    payload: {
      quotationId: quotationId.value,
      version: version.value,
      moneda: moneda.value,
    },
  });
}

export function toSaleEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const saleId = requireNumber(payload, "saleId", row);
  if (!saleId.ok) return saleId;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "sale_created",
    payload: { saleId: saleId.value },
  });
}
