import type { FieldChange } from "~/contracts/events";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
  Currency,
  ProductKind,
  FulfillmentStep,
  FulfillmentAction,
  FulfillmentDocKind,
} from "~/contracts/workflow/vocabulary";

export type LeadHistoryEventType =
  | "lead_registered"
  | "lead_status_updated"
  | "lead_priority_updated"
  | "lead_reviewed"
  | "workflow_stage_changed"
  | "lead_assigned"
  | "lead_reassigned"
  | "rep_legal_recorded"
  | "rate_proposed"
  | "rate_revision_requested"
  | "rate_accepted"
  | "rate_proposal_corrected"
  | "commercial_scope_corrected"
  | "lead_reservation_expired"
  | "venue_added"
  | "venue_updated"
  | "venue_accounts_added"
  | "fulfillment_started"
  | "fulfillment_product_chosen"
  | "fulfillment_step_advanced"
  | "fulfillment_step_rejected"
  | "fulfillment_document_uploaded"
  | "fulfillment_completed"
  | "note_added"
  | "lead_deleted";

const LEAD_HISTORY_EVENT_TYPES = {
  lead_registered: true,
  lead_status_updated: true,
  lead_priority_updated: true,
  lead_reviewed: true,
  workflow_stage_changed: true,
  lead_assigned: true,
  lead_reassigned: true,
  rep_legal_recorded: true,
  rate_proposed: true,
  rate_revision_requested: true,
  rate_accepted: true,
  rate_proposal_corrected: true,
  commercial_scope_corrected: true,
  lead_reservation_expired: true,
  venue_added: true,
  venue_updated: true,
  venue_accounts_added: true,
  fulfillment_started: true,
  fulfillment_product_chosen: true,
  fulfillment_step_advanced: true,
  fulfillment_step_rejected: true,
  fulfillment_document_uploaded: true,
  fulfillment_completed: true,
  note_added: true,
  lead_deleted: true,
} satisfies Record<LeadHistoryEventType, true>;

export function isLeadHistoryEventType(
  value: string,
): value is LeadHistoryEventType {
  return value in LEAD_HISTORY_EVENT_TYPES;
}

export type LeadHistoryPayloadByEvent = {
  lead_registered: {
    ruc: string;
    toStage: Extract<LeadStage, "QUALIFYING">;
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
    priority: LeadPriority;
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
  rep_legal_recorded: {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    dni: string;
    telefono: string;
    email: string;
  };
  rate_proposed: {
    proposalId: string;
    round: number;
    currency: Currency;
  };
  rate_revision_requested: {
    revisionId: string;
    round: number;
    justification: string;
  };
  rate_accepted: {
    proposalId: string;
  };
  rate_proposal_corrected: {
    proposalId: string;
    round: number;
  };
  commercial_scope_corrected: Record<string, never>;
  lead_reservation_expired: {
    fromStage: LeadStage;
  };
  venue_added: {
    venueId: string;
    tradeName: string;
  };
  venue_updated: {
    venueId: string;
    tradeName: string;
  };
  venue_accounts_added: {
    venueId: string;
  };
  fulfillment_started: {
    orderId: string;
    unitCount: number;
  };
  fulfillment_product_chosen: {
    orderId: string;
    productKind: ProductKind;
  };
  fulfillment_step_advanced: {
    orderId: string;
    from: FulfillmentStep;
    to: FulfillmentStep;
    action: FulfillmentAction;
  };
  fulfillment_step_rejected: {
    orderId: string;
    from: FulfillmentStep;
    to: FulfillmentStep;
    reason: string;
  };
  fulfillment_document_uploaded: {
    orderId: string;
    docKind: FulfillmentDocKind;
    artifactId: string;
  };
  fulfillment_completed: {
    orderId: string;
  };
  note_added: {
    body: string;
  };
  lead_deleted: Record<string, never>;
};

export type LeadHistoryEventDraftFor<TEventType extends LeadHistoryEventType> =
  {
    leadId: string;
    eventType: TEventType;
    actorUserId: number | null;
    subjectUserId: number | null;
    payload: LeadHistoryPayloadByEvent[TEventType];
    changes: FieldChange[];
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
  changes: FieldChange[];
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
  changes?: FieldChange[];
  occurredAt: number;
}): LeadHistoryEventDraftFor<TEventType> {
  return {
    leadId: input.leadId,
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    payload: input.payload,
    changes: input.changes ?? [],
    occurredAt: input.occurredAt,
  };
}
