import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStage,
  LeadStatus,
  Moneda,
  AbonoBank,
} from "~/workflow/contracts/lead-schema";

export type LeadHistoryEventType =
  | "lead_registered"
  | "lead_status_updated"
  | "lead_priority_updated"
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

export type LeadHistoryPayloadByEvent = {
  lead_registered: {
    ruc: string;
    toStage: Extract<LeadStage, "PENDING_EXTERNAL_REVIEW">;
  };
  lead_status_updated: {
    fromStatus: LeadStatus | null;
    toStatus: LeadStatus;
    reason: string;
  };
  lead_priority_updated: {
    fromPrioridad: LeadPriority | null;
    toPrioridad: LeadPriority;
    reason: string;
  };
  lead_reviewed: {
    status: LeadStatus;
    prioridad: LeadPriority;
    reason: string;
    fromStage: LeadStage;
    toStage: LeadStage;
  };
  workflow_stage_changed: {
    from: LeadStage;
    to: LeadStage;
  };
  lead_assigned: {
    executiveId: number;
    reason?: string;
  };
  lead_reassigned: {
    fromExecutiveId: number;
    toExecutiveId: number;
    reason?: string;
  };
  commercial_input_completed: {
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    abono: AbonoBank;
    cantidadPos: number;
  };
  quotation_created: {
    quotationId: string;
    version: number;
    moneda: Moneda;
  };
  sale_approved: null;
  sale_created: {
    saleId: string;
  };
  call_logged: {
    outcome: LeadCallOutcome;
    notes: string | null;
  };
  note_added: {
    body: string;
  };
};

export type LeadHistoryEventDraftFor<TEventType extends LeadHistoryEventType> =
  {
    leadId: string;
    eventType: TEventType;
    actorUserId: number | null;
    subjectUserId: number | null;
    payload: LeadHistoryPayloadByEvent[TEventType];
    occurredAt: number;
  };

export type LeadHistoryEventDraft = {
  [TEventType in LeadHistoryEventType]: LeadHistoryEventDraftFor<TEventType>;
}[LeadHistoryEventType];

export type LeadHistoryPerson = {
  names: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
};

export type LeadHistoryEntryFor<
  TEventType extends keyof LeadHistoryPayloadByEvent,
> = {
  id: string;
  leadId: string;
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

export function createHistoryEvent<
  TEventType extends LeadHistoryEventType,
>(input: {
  leadId: string;
  eventType: TEventType;
  actorUserId?: number | null;
  subjectUserId?: number | null;
  payload: LeadHistoryPayloadByEvent[TEventType];
  occurredAt: number;
}): LeadHistoryEventDraftFor<TEventType> {
  return {
    leadId: input.leadId,
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    payload: input.payload,
    occurredAt: input.occurredAt,
  };
}
