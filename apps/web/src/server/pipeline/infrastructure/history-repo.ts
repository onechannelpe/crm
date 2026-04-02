import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import { isPlainRecord } from "~/lib/type-guards";
import {
  type LeadHistoryEntry,
  type LeadHistoryEventDraft,
  type LeadHistoryPerson,
} from "~/server/pipeline/domain/history";
import type { LeadCallOutcome } from "~/server/pipeline/domain/lead";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

type HistoryEventRow = Selectable<Database["pipeline_history_events"]> & {
  actor_names: string | null;
  actor_first_surname: string | null;
  actor_second_surname: string | null;
  subject_names: string | null;
  subject_first_surname: string | null;
  subject_second_surname: string | null;
};
type NewHistoryEventRow = Insertable<Database["pipeline_history_events"]>;

function parseJsonObject(payloadJson: string | null) {
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

function parseString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function parseNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function parseCallOutcome(value: unknown): LeadCallOutcome | null {
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

function toHistoryPerson(input: {
  names: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
}): LeadHistoryPerson | null {
  if (
    input.names === null &&
    input.firstSurname === null &&
    input.secondSurname === null
  ) {
    return null;
  }

  return input;
}

function toHistoryEntry(row: HistoryEventRow): LeadHistoryEntry {
  const base = {
    id: row.id,
    leadId: row.lead_id,
    actorUserId: row.actor_user_id,
    subjectUserId: row.subject_user_id,
    occurredAt: row.occurred_at,
    actor: toHistoryPerson({
      names: row.actor_names,
      firstSurname: row.actor_first_surname,
      secondSurname: row.actor_second_surname,
    }),
    subject: toHistoryPerson({
      names: row.subject_names,
      firstSurname: row.subject_first_surname,
      secondSurname: row.subject_second_surname,
    }),
  };
  const payload = parseJsonObject(row.payload_json);

  switch (row.event_type) {
    case "lead_registered": {
      const ruc = parseString(payload?.ruc);
      return {
        ...base,
        eventType: "lead_registered",
        payload:
          ruc && payload?.toStage === "PENDING_EXTERNAL_REVIEW"
            ? { ruc, toStage: "PENDING_EXTERNAL_REVIEW" }
            : null,
      };
    }
    case "lead_reviewed": {
      const status = parseString(payload?.status);
      const prioridad = parseString(payload?.prioridad);
      const reason = parseString(payload?.reason);
      const fromStage = parseString(payload?.fromStage);
      const toStage = parseString(payload?.toStage);
      return {
        ...base,
        eventType: "lead_reviewed",
        payload:
          status && prioridad && reason && fromStage && toStage
            ? { status, prioridad, reason, fromStage, toStage }
            : null,
      };
    }
    case "workflow_stage_changed": {
      const from = parseString(payload?.from);
      const to = parseString(payload?.to);
      return {
        ...base,
        eventType: "workflow_stage_changed",
        payload: from && to ? { from, to } : null,
      };
    }
    case "lead_assigned": {
      const executiveId = parseNumber(payload?.executiveId);
      return {
        ...base,
        eventType: "lead_assigned",
        payload:
          executiveId !== null
            ? {
                executiveId,
                reason: parseString(payload?.reason) ?? undefined,
              }
            : null,
      };
    }
    case "lead_reassigned": {
      const fromExecutiveId = parseNumber(payload?.fromExecutiveId);
      const toExecutiveId = parseNumber(payload?.toExecutiveId);
      return {
        ...base,
        eventType: "lead_reassigned",
        payload:
          fromExecutiveId !== null && toExecutiveId !== null
            ? {
                fromExecutiveId,
                toExecutiveId,
                reason: parseString(payload?.reason) ?? undefined,
              }
            : null,
      };
    }
    case "commercial_input_completed": {
      const proveedorActual = parseString(payload?.proveedorActual);
      const tasaActual = parseNumber(payload?.tasaActual);
      const gpv = parseNumber(payload?.gpv);
      const ticket = parseNumber(payload?.ticket);
      const abono = parseNumber(payload?.abono);
      const cantidadPos = parseNumber(payload?.cantidadPos);
      return {
        ...base,
        eventType: "commercial_input_completed",
        payload:
          proveedorActual &&
          tasaActual !== null &&
          gpv !== null &&
          ticket !== null &&
          abono !== null &&
          cantidadPos !== null
            ? { proveedorActual, tasaActual, gpv, ticket, abono, cantidadPos }
            : null,
      };
    }
    case "quotation_created": {
      const quotationId = parseNumber(payload?.quotationId);
      const version = parseNumber(payload?.version);
      return {
        ...base,
        eventType: "quotation_created",
        payload:
          quotationId !== null &&
          version !== null &&
          (payload?.moneda === "PEN" || payload?.moneda === "USD")
            ? { quotationId, version, moneda: payload.moneda }
            : null,
      };
    }
    case "sale_approved":
      return {
        ...base,
        eventType: "sale_approved",
        payload: null,
      };
    case "sale_created": {
      const saleId = parseNumber(payload?.saleId);
      return {
        ...base,
        eventType: "sale_created",
        payload: saleId !== null ? { saleId } : null,
      };
    }
    case "call_logged": {
      const outcome = parseCallOutcome(payload?.outcome);
      return {
        ...base,
        eventType: "call_logged",
        payload:
          payload && outcome
            ? { outcome, notes: parseString(payload.notes) }
            : null,
      };
    }
    case "note_added": {
      const body = parseString(payload?.body);
      return {
        ...base,
        eventType: "note_added",
        payload: body ? { body } : null,
      };
    }
  }
}

export function createHistoryRepo(db: DatabaseExecutor) {
  return {
    async insert(values: LeadHistoryEventDraft): Promise<number> {
      const result = await db
        .insertInto("pipeline_history_events")
        .values({
          lead_id: values.leadId,
          event_type: values.eventType,
          actor_user_id: values.actorUserId,
          subject_user_id: values.subjectUserId,
          payload_json: values.payload ? JSON.stringify(values.payload) : null,
          occurred_at: values.occurredAt,
        } satisfies NewHistoryEventRow)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    async listByLeadId(leadId: number): Promise<LeadHistoryEntry[]> {
      const rows = await db
        .selectFrom("pipeline_history_events as event")
        .leftJoin("users as actor", "actor.id", "event.actor_user_id")
        .leftJoin("users as subject", "subject.id", "event.subject_user_id")
        .select([
          "event.id",
          "event.lead_id",
          "event.event_type",
          "event.actor_user_id",
          "event.subject_user_id",
          "event.payload_json",
          "event.occurred_at",
          "actor.names as actor_names",
          "actor.first_surname as actor_first_surname",
          "actor.second_surname as actor_second_surname",
          "subject.names as subject_names",
          "subject.first_surname as subject_first_surname",
          "subject.second_surname as subject_second_surname",
        ])
        .where("event.lead_id", "=", leadId)
        .orderBy("event.occurred_at", "desc")
        .execute();

      return rows.map(toHistoryEntry);
    },
  };
}
