import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import { toHistoryEntryBase, type HistoryEventRow } from "./history-event-row";
import {
  nullableNumber,
  nullableString,
  requireMoneda,
  requireNumber,
  requireString,
} from "./history-payload-fields";

export function toCommercialScopeEntry(
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

  const abonoBank = nullableString(payload, "abonoBank", row);
  if (!abonoBank.ok) return abonoBank;

  const posTotal = nullableNumber(payload, "posTotal", row);
  if (!posTotal.ok) return posTotal;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "commercial_scope_saved",
    payload: {
      proveedorActual: proveedorActual.value,
      tasaActual: tasaActual.value,
      gpv: gpv.value,
      ticket: ticket.value,
      giroNegocio: giroNegocio.value,
      abonoBank: abonoBank.value,
      posTotal: posTotal.value,
    },
  });
}

export function toRequestQuotationEntry(
  row: HistoryEventRow,
): Result<LeadHistoryEntry, DomainError> {
  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "quotation_requested",
    payload: null,
  });
}

export function toRepLegalEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const nombres = requireString(payload, "nombres", row);
  if (!nombres.ok) return nombres;

  const apellidoPaterno = requireString(payload, "apellidoPaterno", row);
  if (!apellidoPaterno.ok) return apellidoPaterno;

  const apellidoMaterno = requireString(payload, "apellidoMaterno", row);
  if (!apellidoMaterno.ok) return apellidoMaterno;

  const dni = requireString(payload, "dni", row);
  if (!dni.ok) return dni;

  const telefono = requireString(payload, "telefono", row);
  if (!telefono.ok) return telefono;

  const email = requireString(payload, "email", row);
  if (!email.ok) return email;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "rep_legal_recorded",
    payload: {
      nombres: nombres.value,
      apellidoPaterno: apellidoPaterno.value,
      apellidoMaterno: apellidoMaterno.value,
      dni: dni.value,
      telefono: telefono.value,
      email: email.value,
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

export function toVenueAddedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const venueId = requireString(payload, "venueId", row);
  if (!venueId.ok) return venueId;
  const nombreComercial = requireString(payload, "nombreComercial", row);
  if (!nombreComercial.ok) return nombreComercial;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "venue_added",
    payload: {
      venueId: venueId.value,
      nombreComercial: nombreComercial.value,
    },
  });
}

export function toVenueUpdatedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const venueId = requireString(payload, "venueId", row);
  if (!venueId.ok) return venueId;
  const nombreComercial = requireString(payload, "nombreComercial", row);
  if (!nombreComercial.ok) return nombreComercial;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "venue_updated",
    payload: {
      venueId: venueId.value,
      nombreComercial: nombreComercial.value,
    },
  });
}
