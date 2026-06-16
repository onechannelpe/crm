import type { FieldChange } from "~/contracts/events";
import type {
  LeadCallOutcome,
  LeadPriority,
  LeadStage,
  LeadStatus,
  Moneda,
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
  | "call_logged"
  | "note_added";

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
  call_logged: true,
  note_added: true,
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
    moneda: Moneda;
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
    nombreComercial: string;
  };
  venue_updated: {
    venueId: string;
    nombreComercial: string;
  };
  venue_accounts_added: {
    venueId: string;
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
