import type { LeadHistoryEntry } from "~/server/pipeline/domain/history";
import type { LeadCallOutcome } from "~/server/pipeline/domain/lead";

import type { PipelineTimelineItem } from "../read-models/lead-detail";
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
): PipelineTimelineItem {
  const actorDisplayName = formatTimelineActorName(event.actor, revealFull);
  const subjectDisplayName = formatTimelineActorName(event.subject, revealFull);

  switch (event.eventType) {
    case "lead_registered":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Prospecto registrado",
        description: `Registrado por ${actorDisplayName}.`,
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
        title: "Prospecto asignado",
        description: `${subjectDisplayName} asignado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "lead_reassigned":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "assignment",
        title: "Prospecto reasignado",
        description: `${subjectDisplayName} reasignado por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "commercial_input_completed":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Información comercial completada",
        description: `Completada por ${actorDisplayName}.`,
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
    case "sale_approved":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "stage-change",
        title: "Lista para venta",
        description: `Aprobada por ${actorDisplayName}.`,
        actorDisplayName,
      };
    case "sale_created":
      return {
        id: `history:${event.id}`,
        occurredAt: event.occurredAt,
        kind: "system",
        title: "Venta creada",
        description: event.payload
          ? `Venta #${event.payload.saleId} creada por ${actorDisplayName}.`
          : `Creada por ${actorDisplayName}.`,
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
  }
}
