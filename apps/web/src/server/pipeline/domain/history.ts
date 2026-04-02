import type { LeadCallOutcome } from "./lead";

export type LeadHistoryEventType =
  | "lead_registered"
  | "lead_reviewed"
  | "workflow_stage_changed"
  | "lead_assigned"
  | "lead_reassigned"
  | "commercial_input_completed"
  | "quotation_created"
  | "sale_approved"
  | "sale_created"
  | "call_logged"
  | "note_added";

export type LeadHistoryPayload =
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
  eventType: LeadHistoryEventType;
  actorUserId: number | null;
  subjectUserId: number | null;
  payload: LeadHistoryPayload | null;
  occurredAt: number;
};

export type LeadHistoryPerson = {
  names: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
};

export type LeadHistoryPayloadByEvent = {
  lead_registered: Extract<
    LeadHistoryPayload,
    { ruc: string; toStage: "PENDING_EXTERNAL_REVIEW" }
  > | null;
  lead_reviewed: Extract<
    LeadHistoryPayload,
    {
      status: string;
      prioridad: string;
      reason: string;
      fromStage: string;
      toStage: string;
    }
  > | null;
  workflow_stage_changed: Extract<
    LeadHistoryPayload,
    { from: string; to: string }
  > | null;
  lead_assigned: Extract<
    LeadHistoryPayload,
    { executiveId: number; reason?: string }
  > | null;
  lead_reassigned: Extract<
    LeadHistoryPayload,
    { fromExecutiveId: number; toExecutiveId: number; reason?: string }
  > | null;
  commercial_input_completed: Extract<
    LeadHistoryPayload,
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
    LeadHistoryPayload,
    { quotationId: number; version: number; moneda: "PEN" | "USD" }
  > | null;
  sale_approved: null;
  sale_created: Extract<LeadHistoryPayload, { saleId: number }> | null;
  call_logged: Extract<
    LeadHistoryPayload,
    { outcome: LeadCallOutcome; notes: string | null }
  > | null;
  note_added: Extract<LeadHistoryPayload, { body: string }> | null;
};

export type LeadHistoryEntryFor<
  TEventType extends keyof LeadHistoryPayloadByEvent,
> = {
  id: number;
  leadId: number;
  eventType: TEventType;
  actorUserId: number | null;
  subjectUserId: number | null;
  payload: LeadHistoryPayloadByEvent[TEventType];
  occurredAt: number;
  actor: LeadHistoryPerson | null;
  subject: LeadHistoryPerson | null;
};

export type LeadHistoryEntry = {
  [TEventType in keyof LeadHistoryPayloadByEvent]: LeadHistoryEntryFor<TEventType>;
}[keyof LeadHistoryPayloadByEvent];

export function createHistoryEvent(input: {
  leadId: number;
  eventType: LeadHistoryEventType;
  actorUserId?: number | null;
  subjectUserId?: number | null;
  payload?: LeadHistoryPayload;
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
