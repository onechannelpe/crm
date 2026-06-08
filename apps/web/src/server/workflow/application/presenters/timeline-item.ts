import type { LeadHistoryEntry } from "~/server/workflow/domain/history";
import type {
  LeadCallOutcome,
  LeadTimelineItem,
} from "~/server/workflow/types";

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
    case "commercial_scope_saved":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Alcance comercial guardado",
        description: `Guardado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "quotation_requested":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "stage-change",
        title: "Cotización solicitada",
        description: `Solicitada por ${actorDisplayName}.`,
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
    case "quotation_created":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Cotización creada",
        description: event.payload
          ? `Cotización #${event.payload.quotationId} creada por ${actorDisplayName}.`
          : `Creada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "rate_negotiation_requested":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "stage-change",
        title: "Revisión de tasa solicitada",
        description: `Ronda ${event.payload.round}: ${event.payload.justification}`,
        actorDisplayName,
      };
    case "sale_approved":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "stage-change",
        title: "Lista para venta",
        description: `Aprobada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "venue_added":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Sede agregada",
        description: `${event.payload.nombreComercial} registrada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "venue_updated":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Sede actualizada",
        description: `${event.payload.nombreComercial} actualizada por ${actorDisplayName}.`,
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
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
