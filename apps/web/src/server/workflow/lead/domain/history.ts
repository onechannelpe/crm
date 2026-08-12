import type { FieldChange } from "~/contracts/events";
import type {
  CloseReason,
  Currency,
  FulfillmentAction,
  FulfillmentDocKind,
  FulfillmentStep,
  LeadPriority,
  LeadStage,
  LeadStatus,
  ProductKind,
} from "~/contracts/workflow/vocabulary";
import type {
  BranchId,
  FileAssetId,
  FulfillmentOrderId,
  UserId,
  WorkflowLeadId,
  WorkflowRateProposalId,
  WorkflowRateRevisionId,
  WorkflowVenueId,
} from "~/domain/ids";

import type { LeadState } from "./state";

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
  | "lead_closed"
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

const LEAD_HISTORY_EVENT_TYPES = new Set<LeadHistoryEventType>([
  "lead_registered",
  "lead_status_updated",
  "lead_priority_updated",
  "lead_reviewed",
  "workflow_stage_changed",
  "lead_assigned",
  "lead_reassigned",
  "rep_legal_recorded",
  "rate_proposed",
  "rate_revision_requested",
  "rate_accepted",
  "rate_proposal_corrected",
  "commercial_scope_corrected",
  "lead_closed",
  "lead_reservation_expired",
  "venue_added",
  "venue_updated",
  "venue_accounts_added",
  "fulfillment_started",
  "fulfillment_product_chosen",
  "fulfillment_step_advanced",
  "fulfillment_step_rejected",
  "fulfillment_document_uploaded",
  "fulfillment_completed",
  "note_added",
  "lead_deleted",
]);

export function isLeadHistoryEventType(
  value: string,
): value is LeadHistoryEventType {
  return LEAD_HISTORY_EVENT_TYPES.has(value as LeadHistoryEventType);
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
    executiveId: UserId;
    reason?: string;
  };
  lead_reassigned: {
    fromExecutiveId: UserId;
    toExecutiveId: UserId;
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
    proposalId: WorkflowRateProposalId;
    round: number;
    currency: Currency;
  };
  rate_revision_requested: {
    revisionId: WorkflowRateRevisionId;
    round: number;
    justification: string;
  };
  rate_accepted: {
    proposalId: WorkflowRateProposalId;
  };
  rate_proposal_corrected: {
    proposalId: WorkflowRateProposalId;
    round: number;
  };
  commercial_scope_corrected: Record<string, never>;
  lead_closed: {
    reason: CloseReason;
    note: string | null;
    fromStage: LeadStage;
  };
  lead_reservation_expired: {
    fromStage: LeadStage;
  };
  venue_added: {
    venueId: WorkflowVenueId;
    tradeName: string;
  };
  venue_updated: {
    venueId: WorkflowVenueId;
    tradeName: string;
  };
  venue_accounts_added: {
    venueId: WorkflowVenueId;
  };
  fulfillment_started: {
    orderId: FulfillmentOrderId;
    unitCount: number;
  };
  fulfillment_product_chosen: {
    orderId: FulfillmentOrderId;
    productKind: ProductKind;
  };
  fulfillment_step_advanced: {
    orderId: FulfillmentOrderId;
    from: FulfillmentStep;
    to: FulfillmentStep;
    action: FulfillmentAction;
  };
  fulfillment_step_rejected: {
    orderId: FulfillmentOrderId;
    from: FulfillmentStep;
    to: FulfillmentStep;
    reason: string;
  };
  fulfillment_document_uploaded: {
    orderId: FulfillmentOrderId;
    docKind: FulfillmentDocKind;
    fileAssetId: FileAssetId;
  };
  fulfillment_completed: {
    orderId: FulfillmentOrderId;
  };
  note_added: {
    body: string;
  };
  lead_deleted: Record<string, never>;
};

// Computed context for notification policy; unlike `payload`, it is not persisted.
export type LeadNotificationContext = {
  ruc: string;
  executiveId: UserId;
  branchId: BranchId;
  paymentUnits?: { label: string; paymentUrl: string | null }[];
};

export function leadNotificationContext(
  state: LeadState,
): LeadNotificationContext {
  return {
    ruc: state.ruc,
    executiveId: state.executiveId,
    branchId: state.branchId,
  };
}

export type LeadHistoryEventDraftFor<TEventType extends LeadHistoryEventType> =
  {
    leadId: WorkflowLeadId;
    eventType: TEventType;
    actorUserId: UserId | null;
    subjectUserId: UserId | null;
    payload: LeadHistoryPayloadByEvent[TEventType];
    changes: FieldChange[];
    occurredAt: Date;
    notificationContext?: LeadNotificationContext;
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
  actorUserId: string | null;
  subjectUserId: string | null;
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
  leadId: WorkflowLeadId;
  eventType: TEventType;
  actorUserId?: UserId | null;
  subjectUserId?: UserId | null;
  payload: LeadHistoryPayloadByEvent[TEventType];
  changes?: FieldChange[];
  occurredAt: Date;
  notificationContext?: LeadNotificationContext;
}): LeadHistoryEventDraftFor<TEventType> {
  return {
    leadId: input.leadId,
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    subjectUserId: input.subjectUserId ?? null,
    payload: input.payload,
    changes: input.changes ?? [],
    occurredAt: input.occurredAt,
    notificationContext: input.notificationContext,
  };
}
