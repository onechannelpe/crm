import type {
  LeadCallOutcome,
  PipelineHistoryEventType,
  UsersTable,
} from "~/lib/db/types";
import { isPlainRecord } from "~/lib/type-guards";

type PersonName = Pick<
  UsersTable,
  "names" | "first_surname" | "second_surname"
>;

export type TimelineItem = {
  id: string;
  occurredAt: number;
  kind: "call" | "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
};

export type RawTimelineEvent = {
  id: number;
  event_type: PipelineHistoryEventType;
  payload_json: string | null;
  occurred_at: number;
  actor_names: string | null;
  actor_first_surname: string | null;
  actor_second_surname: string | null;
  subject_names: string | null;
  subject_first_surname: string | null;
  subject_second_surname: string | null;
};

function formatActorName(
  actor: PersonName | null | undefined,
  revealFull: boolean,
) {
  if (!actor) {
    return "Sistema";
  }

  const names = actor.names.trim();
  const firstName = names.split(/\s+/)[0] ?? "";
  const firstSurname = actor.first_surname.trim();

  if (revealFull) {
    return [names, firstSurname, actor.second_surname.trim()]
      .filter((value) => value.length > 0)
      .join(" ");
  }

  return [firstName, firstSurname ? `${firstSurname[0]}.` : ""]
    .filter((value) => value.length > 0)
    .join(" ");
}

function parsePayload(payloadJson: string | null) {
  if (!payloadJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

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

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function asCallOutcome(value: unknown): LeadCallOutcome | null {
  switch (value) {
    case "answered":
    case "no_answer":
    case "wrong_number":
    case "callback_requested":
    case "qualified":
    case "disqualified":
      return value;
    default:
      return null;
  }
}

export function presentTimeline(
  events: RawTimelineEvent[],
  revealFull: boolean,
): TimelineItem[] {
  return events.map((event) => {
    const payload = parsePayload(event.payload_json);
    const actorDisplayName = formatActorName(
      {
        names: event.actor_names ?? "",
        first_surname: event.actor_first_surname ?? "",
        second_surname: event.actor_second_surname ?? "",
      },
      revealFull,
    );
    const subjectDisplayName = formatActorName(
      {
        names: event.subject_names ?? "",
        first_surname: event.subject_first_surname ?? "",
        second_surname: event.subject_second_surname ?? "",
      },
      revealFull,
    );

    switch (event.event_type) {
      case "record_registered":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "system",
          title: "Prospecto registrado",
          description: `Registrado por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "record_reviewed":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "system",
          title: "Revisión completada",
          description:
            asString(payload?.reason) ?? `Revisado por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "workflow_stage_changed":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "stage-change",
          title: "Etapa actualizada",
          description:
            asString(payload?.from) && asString(payload?.to)
              ? `${asString(payload?.from)} -> ${asString(payload?.to)}`
              : `Actualizado por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "record_assigned":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "assignment",
          title: "Prospecto asignado",
          description: `${subjectDisplayName} asignado por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "record_reassigned":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "assignment",
          title: "Prospecto reasignado",
          description: `${subjectDisplayName} reasignado por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "commercial_input_completed":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "system",
          title: "Información comercial completada",
          description: `Completada por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "quotation_created":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "system",
          title: "Cotización creada",
          description:
            asNumber(payload?.quotationId) !== null
              ? `Cotización #${asNumber(payload?.quotationId)} creada por ${actorDisplayName}.`
              : `Creada por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "sale_approved":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "stage-change",
          title: "Lista para venta",
          description: `Aprobada por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "sale_created":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "system",
          title: "Venta creada",
          description:
            asNumber(payload?.saleId) !== null
              ? `Venta #${asNumber(payload?.saleId)} creada por ${actorDisplayName}.`
              : `Creada por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "call_logged":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "call",
          title: describeCallOutcome(asCallOutcome(payload?.outcome)),
          description:
            asString(payload?.notes) || `Registrada por ${actorDisplayName}.`,
          actorDisplayName,
        };
      case "note_added":
        return {
          id: `history:${event.id}`,
          occurredAt: event.occurred_at,
          kind: "note",
          title: "Nota registrada",
          description:
            asString(payload?.body) || `Registrada por ${actorDisplayName}.`,
          actorDisplayName,
        };
    }
  });
}
