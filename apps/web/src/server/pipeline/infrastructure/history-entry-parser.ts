import { isPlainRecord } from "~/lib/type-guards";
import type { LeadHistoryEntry } from "~/server/pipeline/domain/history";
import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/server/pipeline/domain/lead";
import {
  parseLeadPriority,
  parseLeadStage,
  parseLeadStatus,
} from "~/server/pipeline/domain/lead";

export type HistoryEventRow = {
  id: number;
  lead_id: number;
  event_type: LeadHistoryEntry["eventType"];
  actor_user_id: number | null;
  subject_user_id: number | null;
  payload_json: string | null;
  occurred_at: number;
  actor_names: string | null;
  actor_first_surname: string | null;
  actor_second_surname: string | null;
  subject_names: string | null;
  subject_first_surname: string | null;
  subject_second_surname: string | null;
};

function parsePayload(row: HistoryEventRow) {
  if (row.payload_json === null) {
    return null;
  }

  try {
    const value = JSON.parse(row.payload_json) as unknown;
    if (isPlainRecord(value)) {
      return value;
    }
  } catch {}

  throw new Error(
    `Invalid history payload for event ${row.id} (${row.event_type})`,
  );
}

function requireString(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
) {
  const value = payload?.[key];
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  throw new Error(
    `Invalid history payload field "${key}" for event ${row.id} (${row.event_type})`,
  );
}

function optionalString(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
) {
  const value = payload?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }

  throw new Error(
    `Invalid history payload field "${key}" for event ${row.id} (${row.event_type})`,
  );
}

function nullableString(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
) {
  const value = payload?.[key];
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }

  throw new Error(
    `Invalid history payload field "${key}" for event ${row.id} (${row.event_type})`,
  );
}

function requireNumber(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
) {
  const value = payload?.[key];
  if (typeof value === "number") {
    return value;
  }

  throw new Error(
    `Invalid history payload field "${key}" for event ${row.id} (${row.event_type})`,
  );
}

function requireLeadStage(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): LeadStage {
  const parsed = parseLeadStage(requireString(payload, key, row));
  if (parsed.ok && parsed.value !== undefined) {
    return parsed.value;
  }

  throw new Error(
    `Invalid history payload field "${key}" for event ${row.id} (${row.event_type})`,
  );
}

function requireLeadStatus(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): LeadStatus {
  const parsed = parseLeadStatus(requireString(payload, key, row));
  if (parsed.ok && parsed.value !== undefined) {
    return parsed.value;
  }

  throw new Error(
    `Invalid history payload field "${key}" for event ${row.id} (${row.event_type})`,
  );
}

function requireLeadPriority(
  payload: Record<string, unknown> | null,
  key: string,
  row: HistoryEventRow,
): LeadPriority {
  const parsed = parseLeadPriority(requireString(payload, key, row));
  if (parsed.ok && parsed.value !== undefined) {
    return parsed.value;
  }

  throw new Error(
    `Invalid history payload field "${key}" for event ${row.id} (${row.event_type})`,
  );
}

function requireCallOutcome(
  payload: Record<string, unknown> | null,
  row: HistoryEventRow,
): LeadCallOutcome {
  const value = payload?.outcome;
  switch (value) {
    case "answered":
    case "no_answer":
    case "wrong_number":
    case "callback_requested":
    case "qualified":
    case "disqualified":
      return value;
    default:
      throw new Error(
        `Invalid history payload field "outcome" for event ${row.id} (${row.event_type})`,
      );
  }
}

export function toHistoryEntry(row: HistoryEventRow): LeadHistoryEntry {
  const base = {
    id: row.id,
    leadId: row.lead_id,
    actorUserId: row.actor_user_id,
    subjectUserId: row.subject_user_id,
    occurredAt: row.occurred_at,
    actor:
      row.actor_names === null &&
      row.actor_first_surname === null &&
      row.actor_second_surname === null
        ? null
        : {
            names: row.actor_names,
            firstSurname: row.actor_first_surname,
            secondSurname: row.actor_second_surname,
          },
    subject:
      row.subject_names === null &&
      row.subject_first_surname === null &&
      row.subject_second_surname === null
        ? null
        : {
            names: row.subject_names,
            firstSurname: row.subject_first_surname,
            secondSurname: row.subject_second_surname,
          },
  };
  const payload = parsePayload(row);

  switch (row.event_type) {
    case "lead_registered":
      return {
        ...base,
        eventType: "lead_registered",
        payload: {
          ruc: requireString(payload, "ruc", row),
          toStage: "PENDING_EXTERNAL_REVIEW",
        },
      };
    case "lead_reviewed":
      return {
        ...base,
        eventType: "lead_reviewed",
        payload: {
          status: requireLeadStatus(payload, "status", row),
          prioridad: requireLeadPriority(payload, "prioridad", row),
          reason: requireString(payload, "reason", row),
          fromStage: requireLeadStage(payload, "fromStage", row),
          toStage: requireLeadStage(payload, "toStage", row),
        },
      };
    case "workflow_stage_changed":
      return {
        ...base,
        eventType: "workflow_stage_changed",
        payload: {
          from: requireLeadStage(payload, "from", row),
          to: requireLeadStage(payload, "to", row),
        },
      };
    case "lead_assigned":
      return {
        ...base,
        eventType: "lead_assigned",
        payload: {
          executiveId: requireNumber(payload, "executiveId", row),
          reason: optionalString(payload, "reason", row),
        },
      };
    case "lead_reassigned":
      return {
        ...base,
        eventType: "lead_reassigned",
        payload: {
          fromExecutiveId: requireNumber(payload, "fromExecutiveId", row),
          toExecutiveId: requireNumber(payload, "toExecutiveId", row),
          reason: optionalString(payload, "reason", row),
        },
      };
    case "commercial_input_completed":
      return {
        ...base,
        eventType: "commercial_input_completed",
        payload: {
          proveedorActual: requireString(payload, "proveedorActual", row),
          tasaActual: requireNumber(payload, "tasaActual", row),
          gpv: requireNumber(payload, "gpv", row),
          ticket: requireNumber(payload, "ticket", row),
          abono: requireNumber(payload, "abono", row),
          cantidadPos: requireNumber(payload, "cantidadPos", row),
        },
      };
    case "quotation_created":
      if (payload?.moneda !== "PEN" && payload?.moneda !== "USD") {
        throw new Error(
          `Invalid history payload field "moneda" for event ${row.id} (${row.event_type})`,
        );
      }
      return {
        ...base,
        eventType: "quotation_created",
        payload: {
          quotationId: requireNumber(payload, "quotationId", row),
          version: requireNumber(payload, "version", row),
          moneda: payload.moneda,
        },
      };
    case "sale_approved":
      return {
        ...base,
        eventType: "sale_approved",
        payload: null,
      };
    case "sale_created":
      return {
        ...base,
        eventType: "sale_created",
        payload: {
          saleId: requireNumber(payload, "saleId", row),
        },
      };
    case "call_logged":
      return {
        ...base,
        eventType: "call_logged",
        payload: {
          outcome: requireCallOutcome(payload, row),
          notes: nullableString(payload, "notes", row),
        },
      };
    case "note_added":
      return {
        ...base,
        eventType: "note_added",
        payload: {
          body: requireString(payload, "body", row),
        },
      };
  }
}
