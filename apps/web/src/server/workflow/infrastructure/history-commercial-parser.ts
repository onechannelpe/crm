import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import type { HistoryEventRow } from "./history-event-row";
import { toHistoryEntryBase } from "./history-event-row";
import {
  nullableModalidadCobro,
  nullableString,
  requireCulqiProductKind,
  requireMoneda,
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

  const giroNegocio = requireString(payload, "giroNegocio", row);
  if (!giroNegocio.ok) return giroNegocio;
  const tipoProducto = requireCulqiProductKind(payload, "tipoProducto", row);
  if (!tipoProducto.ok) return tipoProducto;
  const urlCliente = nullableString(payload, "urlCliente", row);
  if (!urlCliente.ok) return urlCliente;
  const modalidadCobro = nullableModalidadCobro(payload, "modalidadCobro", row);
  if (!modalidadCobro.ok) return modalidadCobro;
  const repLegalNombres = requireString(payload, "repLegalNombres", row);
  if (!repLegalNombres.ok) return repLegalNombres;
  const repLegalDni = requireString(payload, "repLegalDni", row);
  if (!repLegalDni.ok) return repLegalDni;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "commercial_input_completed",
    payload: {
      proveedorActual: proveedorActual.value,
      tasaActual: tasaActual.value,
      gpv: gpv.value,
      ticket: ticket.value,
      giroNegocio: giroNegocio.value,
      tipoProducto: tipoProducto.value,
      urlCliente: urlCliente.value,
      modalidadCobro: modalidadCobro.value,
      repLegalNombres: repLegalNombres.value,
      repLegalDni: repLegalDni.value,
    },
  });
}

export function toQuotationEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const quotationId = requireString(payload, "quotationId", row);
  if (!quotationId.ok) return quotationId;

  const version = requireNumber(payload, "version", row);
  if (!version.ok) return version;

  const moneda = requireMoneda(payload, row);
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
  const saleId = requireString(payload, "saleId", row);
  if (!saleId.ok) return saleId;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "sale_created",
    payload: { saleId: saleId.value },
  });
}

export function toVenueAddedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const venueId = requireString(payload, "venueId", row);
  if (!venueId.ok) return venueId;
  const saleId = requireString(payload, "saleId", row);
  if (!saleId.ok) return saleId;
  const nombreComercial = requireString(payload, "nombreComercial", row);
  if (!nombreComercial.ok) return nombreComercial;

  const isFirstVenue = payload?.isFirstVenue;
  if (typeof isFirstVenue !== "boolean") {
    throw new Error(
      `Invalid history payload field "isFirstVenue" for event ${row.id} (${row.event_type})`,
    );
  }

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "venue_added",
    payload: {
      venueId: venueId.value,
      saleId: saleId.value,
      nombreComercial: nombreComercial.value,
      isFirstVenue,
    },
  });
}
