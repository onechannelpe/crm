import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadHistoryEntry } from "~/server/workflow/domain/history";

import { toHistoryEntryBase, type HistoryEventRow } from "./history-event-row";
import {
  requireMoneda,
  requireNumber,
  requireString,
} from "./history-payload-fields";

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

export function toRateProposedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const proposalId = requireString(payload, "proposalId", row);
  if (!proposalId.ok) return proposalId;

  const round = requireNumber(payload, "round", row);
  if (!round.ok) return round;

  const currency = requireMoneda(payload, row);
  if (!currency.ok) return currency;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "rate_proposed",
    payload: {
      proposalId: proposalId.value,
      round: round.value,
      currency: currency.value,
    },
  });
}

export function toRateRevisionRequestedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const revisionId = requireString(payload, "revisionId", row);
  if (!revisionId.ok) return revisionId;

  const round = requireNumber(payload, "round", row);
  if (!round.ok) return round;

  const justification = requireString(payload, "justification", row);
  if (!justification.ok) return justification;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "rate_revision_requested",
    payload: {
      revisionId: revisionId.value,
      round: round.value,
      justification: justification.value,
    },
  });
}

export function toRateAcceptedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const proposalId = requireString(payload, "proposalId", row);
  if (!proposalId.ok) return proposalId;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "rate_accepted",
    payload: {
      proposalId: proposalId.value,
    },
  });
}

export function toRateProposalCorrectedEntry(
  row: HistoryEventRow,
  payload: Record<string, unknown> | null,
): Result<LeadHistoryEntry, DomainError> {
  const proposalId = requireString(payload, "proposalId", row);
  if (!proposalId.ok) return proposalId;

  const round = requireNumber(payload, "round", row);
  if (!round.ok) return round;

  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "rate_proposal_corrected",
    payload: {
      proposalId: proposalId.value,
      round: round.value,
    },
  });
}

export function toCommercialScopeCorrectedEntry(
  row: HistoryEventRow,
): Result<LeadHistoryEntry, DomainError> {
  return Ok({
    ...toHistoryEntryBase(row),
    eventType: "commercial_scope_corrected",
    payload: {},
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
