import type { LeadCallOutcome, PipelineHistoryEventType } from "~/lib/db/types";
import { isPlainRecord } from "~/lib/type-guards";

export type PipelineHistoryEventPayload =
  | { ruc: string; toStage: "PENDING_EXTERNAL_REVIEW" }
  | {
      status: string;
      prioridad: string;
      reason: string;
      fromStage: string;
      toStage: string;
    }
  | { from: string; to: string }
  | { executiveId: number; reason?: string }
  | { fromExecutiveId: number; toExecutiveId: number; reason?: string }
  | {
      proveedorActual: string;
      tasaActual: number;
      gpv: number;
      ticket: number;
      abono: number;
      cantidadPos: number;
    }
  | { quotationId: number; version: number; moneda: "PEN" | "USD" }
  | { saleId: number }
  | { outcome: LeadCallOutcome; notes: string | null }
  | { body: string };

export type LeadHistoryEventDraft = {
  leadId: number;
  eventType: PipelineHistoryEventType;
  actorUserId: number | null;
  subjectUserId: number | null;
  payload: PipelineHistoryEventPayload | null;
  occurredAt: number;
};

export type ParsedHistoryPayloadMap = {
  lead_registered: Extract<
    PipelineHistoryEventPayload,
    { ruc: string; toStage: "PENDING_EXTERNAL_REVIEW" }
  > | null;
  lead_reviewed: Extract<
    PipelineHistoryEventPayload,
    {
      status: string;
      prioridad: string;
      reason: string;
      fromStage: string;
      toStage: string;
    }
  > | null;
  workflow_stage_changed: Extract<
    PipelineHistoryEventPayload,
    { from: string; to: string }
  > | null;
  lead_assigned: Extract<
    PipelineHistoryEventPayload,
    { executiveId: number; reason?: string }
  > | null;
  lead_reassigned: Extract<
    PipelineHistoryEventPayload,
    { fromExecutiveId: number; toExecutiveId: number; reason?: string }
  > | null;
  commercial_input_completed: Extract<
    PipelineHistoryEventPayload,
    {
      proveedorActual: string;
      tasaActual: number;
      gpv: number;
      ticket: number;
      abono: number;
      cantidadPos: number;
    }
  > | null;
  quotation_created: Extract<
    PipelineHistoryEventPayload,
    { quotationId: number; version: number; moneda: "PEN" | "USD" }
  > | null;
  sale_approved: null;
  sale_created: Extract<PipelineHistoryEventPayload, { saleId: number }> | null;
  call_logged: Extract<
    PipelineHistoryEventPayload,
    { outcome: LeadCallOutcome; notes: string | null }
  > | null;
  note_added: Extract<PipelineHistoryEventPayload, { body: string }> | null;
};

export type LeadHistoryEntrySource = {
  id: number;
  leadId: number;
  eventType: PipelineHistoryEventType;
  actorUserId: number | null;
  subjectUserId: number | null;
  payloadJson: string | null;
  occurredAt: number;
  actorNames: string | null;
  actorFirstSurname: string | null;
  actorSecondSurname: string | null;
  subjectNames: string | null;
  subjectFirstSurname: string | null;
  subjectSecondSurname: string | null;
};

type ParsedHistoryEntryBase = Omit<
  LeadHistoryEntrySource,
  "eventType" | "payloadJson"
>;

export type ParsedHistoryEntryFor<
  TEventType extends keyof ParsedHistoryPayloadMap,
> = ParsedHistoryEntryBase & {
  eventType: TEventType;
  payload: ParsedHistoryPayloadMap[TEventType];
};

export type ParsedHistoryEntry = {
  [TEventType in keyof ParsedHistoryPayloadMap]: ParsedHistoryEntryFor<TEventType>;
}[keyof ParsedHistoryPayloadMap];

function parseJsonRecord(payloadJson: string | null) {
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

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
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

function toParsedHistoryEntryBase(
  row: LeadHistoryEntrySource,
): ParsedHistoryEntryBase {
  return {
    id: row.id,
    leadId: row.leadId,
    actorUserId: row.actorUserId,
    subjectUserId: row.subjectUserId,
    occurredAt: row.occurredAt,
    actorNames: row.actorNames,
    actorFirstSurname: row.actorFirstSurname,
    actorSecondSurname: row.actorSecondSurname,
    subjectNames: row.subjectNames,
    subjectFirstSurname: row.subjectFirstSurname,
    subjectSecondSurname: row.subjectSecondSurname,
  };
}

export function parseHistoryEntry(
  row: LeadHistoryEntrySource,
): ParsedHistoryEntry {
  const base = toParsedHistoryEntryBase(row);
  const payload = parseJsonRecord(row.payloadJson);

  switch (row.eventType) {
    case "lead_registered":
      return {
        ...base,
        eventType: "lead_registered",
        payload:
          payload &&
          isString(payload.ruc) &&
          payload.toStage === "PENDING_EXTERNAL_REVIEW"
            ? { ruc: payload.ruc, toStage: "PENDING_EXTERNAL_REVIEW" }
            : null,
      };
    case "lead_reviewed":
      return {
        ...base,
        eventType: "lead_reviewed",
        payload:
          payload &&
          isString(payload.status) &&
          isString(payload.prioridad) &&
          isString(payload.reason) &&
          isString(payload.fromStage) &&
          isString(payload.toStage)
            ? {
                status: payload.status,
                prioridad: payload.prioridad,
                reason: payload.reason,
                fromStage: payload.fromStage,
                toStage: payload.toStage,
              }
            : null,
      };
    case "workflow_stage_changed":
      return {
        ...base,
        eventType: "workflow_stage_changed",
        payload:
          payload && isString(payload.from) && isString(payload.to)
            ? { from: payload.from, to: payload.to }
            : null,
      };
    case "lead_assigned":
      return {
        ...base,
        eventType: "lead_assigned",
        payload:
          payload && isNumber(payload.executiveId)
            ? {
                executiveId: payload.executiveId,
                reason: isString(payload.reason) ? payload.reason : undefined,
              }
            : null,
      };
    case "lead_reassigned":
      return {
        ...base,
        eventType: "lead_reassigned",
        payload:
          payload &&
          isNumber(payload.fromExecutiveId) &&
          isNumber(payload.toExecutiveId)
            ? {
                fromExecutiveId: payload.fromExecutiveId,
                toExecutiveId: payload.toExecutiveId,
                reason: isString(payload.reason) ? payload.reason : undefined,
              }
            : null,
      };
    case "commercial_input_completed":
      return {
        ...base,
        eventType: "commercial_input_completed",
        payload:
          payload &&
          isString(payload.proveedorActual) &&
          isNumber(payload.tasaActual) &&
          isNumber(payload.gpv) &&
          isNumber(payload.ticket) &&
          isNumber(payload.abono) &&
          isNumber(payload.cantidadPos)
            ? {
                proveedorActual: payload.proveedorActual,
                tasaActual: payload.tasaActual,
                gpv: payload.gpv,
                ticket: payload.ticket,
                abono: payload.abono,
                cantidadPos: payload.cantidadPos,
              }
            : null,
      };
    case "quotation_created":
      return {
        ...base,
        eventType: "quotation_created",
        payload:
          payload &&
          isNumber(payload.quotationId) &&
          isNumber(payload.version) &&
          (payload.moneda === "PEN" || payload.moneda === "USD")
            ? {
                quotationId: payload.quotationId,
                version: payload.version,
                moneda: payload.moneda,
              }
            : null,
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
        payload:
          payload && isNumber(payload.saleId)
            ? { saleId: payload.saleId }
            : null,
      };
    case "call_logged":
      const outcome = parseCallOutcome(payload?.outcome);
      return {
        ...base,
        eventType: "call_logged",
        payload:
          payload && outcome
            ? {
                outcome,
                notes: isString(payload.notes) ? payload.notes : null,
              }
            : null,
      };
    case "note_added":
      return {
        ...base,
        eventType: "note_added",
        payload:
          payload && isString(payload.body) ? { body: payload.body } : null,
      };
  }
}

export function createHistoryEvent(input: {
  leadId: number;
  eventType: PipelineHistoryEventType;
  actorUserId?: number | null;
  subjectUserId?: number | null;
  payload?: PipelineHistoryEventPayload;
  occurredAt: number;
}): LeadHistoryEventDraft {
  return {
    leadId: input.leadId,
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    payload: input.payload ?? null,
    occurredAt: input.occurredAt,
  };
}
