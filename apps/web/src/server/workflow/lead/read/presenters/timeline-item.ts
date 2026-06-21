import { summarizeFieldChanges } from "~/contracts/events";
import type { LeadTimelineItem } from "~/contracts/workflow/views";
import type { LeadCallOutcome } from "~/contracts/workflow/vocabulary";
import type { LeadHistoryEntry } from "~/server/workflow/lead/domain/history";

import { formatTimelineActorName } from "./timeline-actor-name";

function describeCallOutcome(outcome: LeadCallOutcome | null) {
  switch (outcome) {
    case "answered":
      return "Llamada contestada";
    case "no_answer":
      return "Sin respuesta";
    case "wrong_number":
      return "Número incorrecto";
    case "callback_requested":
      return "Pidió devolución";
    case "qualified":
      return "Cliente calificado";
    case "disqualified":
      return "Cliente descartado";
    default:
      return "Llamada registrada";
  }
}

export function presentTimelineItem(
  event: LeadHistoryEntry,
  revealFull: boolean,
): LeadTimelineItem {
  const actorDisplayName = formatTimelineActorName(event.actor, revealFull);
  const subjectDisplayName = formatTimelineActorName(event.subject, revealFull);

  switch (event.eventType) {
    case "lead_registered":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Cliente registrado",
        description: `Registrado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "lead_status_updated":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Estado actualizado",
        description: event.payload.reason,
        actorDisplayName,
      };
    case "lead_priority_updated":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Prioridad actualizada",
        description: event.payload.reason,
        actorDisplayName,
      };
    case "lead_reviewed":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Revisión completada",
        description:
          event.payload?.reason ?? `Revisado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "workflow_stage_changed":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "stage-change",
        title: "Etapa actualizada",
        description: event.payload
          ? `${event.payload.from} -> ${event.payload.to}`
          : `Actualizado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "lead_assigned":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "assignment",
        title: "Cliente asignado",
        description: `${subjectDisplayName} asignado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "lead_reassigned":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "assignment",
        title: "Cliente reasignado",
        description: `${subjectDisplayName} reasignado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "rep_legal_recorded":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Representante legal registrado",
        description: `Registrado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "rate_proposed":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Tarifa propuesta",
        description: `Ronda ${event.payload.round} propuesta por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "rate_revision_requested":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Revisión de tarifa solicitada",
        description: `Ronda ${event.payload.round}: ${event.payload.justification}`,
        actorDisplayName,
      };
    case "rate_accepted":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "stage-change",
        title: "Tarifa aceptada",
        description: `Aceptada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "rate_proposal_corrected":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Tarifa corregida",
        description:
          event.changes.length > 0
            ? summarizeFieldChanges(event.changes)
            : `Corregida por ${actorDisplayName}.`,
        actorDisplayName,
        changes: event.changes,
      };
    case "commercial_scope_corrected":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Información comercial corregida",
        description:
          event.changes.length > 0
            ? summarizeFieldChanges(event.changes)
            : `Corregida por ${actorDisplayName}.`,
        actorDisplayName,
        changes: event.changes,
      };
    case "lead_reservation_expired":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "stage-change",
        title: "Cotizacion vencida",
        description: "El registro venció y fue liberado.",
        actorDisplayName,
      };
    case "venue_added":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Sede agregada",
        description: `${event.payload.tradeName} registrada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "venue_updated":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Sede actualizada",
        description: `${event.payload.tradeName} actualizada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "venue_accounts_added":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Cuentas de sede registradas",
        description: `Registradas por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "call_logged":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "call",
        title: describeCallOutcome(event.payload?.outcome ?? null),
        description:
          event.payload?.notes || `Registrada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "note_added":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "note",
        title: "Nota registrada",
        description:
          event.payload?.body || `Registrada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "lead_deleted":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Cliente eliminado",
        description: `Eliminado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
