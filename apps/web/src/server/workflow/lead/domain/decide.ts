import type { FieldChange } from "~/contracts/events";
import {
  MAX_RATE_REVISION_FILES,
  MAX_RATE_REVISION_ROUNDS,
} from "~/contracts/workflow/limits";
import type {
  CloseReason,
  Currency,
  LeadPriority,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import { fail, type DomainError } from "~/domain/errors";
import type {
  FulfillmentOrderId,
  UserId,
  WorkflowRateProposalId,
  WorkflowRateRevisionId,
  WorkflowRateRevisionFileId,
  WorkflowVenueId,
} from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import { Err, Ok, type Result } from "~/shared/result";

import { applyEvents } from "./evolve";
import { createHistoryEvent, type LeadHistoryEventDraft } from "./history";
import { authorizeLeadAction } from "./policy";
import { isReservationActive } from "./reservation";
import { resolveReviewTransition } from "./review";
import type { LeadState } from "./state";

type Actor = Pick<WorkflowActor, "userId" | "role">;
type TransitionResult = Result<
  { next: LeadState; events: LeadHistoryEventDraft[] },
  DomainError
>;

function finish(
  state: LeadState,
  events: LeadHistoryEventDraft[],
  actor: Actor,
  occurredAt: Date,
  reservationExpiresAt?: Date | null,
): TransitionResult {
  const next = applyEvents(state, events, {
    actorUserId: actor.userId,
    updatedAt: occurredAt,
  });
  return Ok({
    next:
      reservationExpiresAt === undefined
        ? next
        : { ...next, reservationExpiresAt },
    events,
  });
}

export function deleteLead(
  state: LeadState,
  input: { actor: Actor; occurredAt: Date },
): TransitionResult {
  const authz = authorizeLeadAction("delete", input.actor, state);
  if (!authz.ok) {
    return authz;
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_deleted",
      actorUserId: input.actor.userId,
      payload: {},
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt);
}

export function reassignLead(
  state: LeadState,
  input: { actor: Actor; toExecutiveId: UserId; occurredAt: Date },
): TransitionResult {
  const authz = authorizeLeadAction("reassign", input.actor, state);
  if (!authz.ok) {
    return authz;
  }

  if (state.executiveId === input.toExecutiveId) {
    return Err(fail("same_executive"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_reassigned",
      actorUserId: input.actor.userId,
      subjectUserId: input.toExecutiveId,
      payload: {
        fromExecutiveId: state.executiveId,
        toExecutiveId: input.toExecutiveId,
      },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt);
}

export function proposeRate(
  state: LeadState,
  input: {
    actor: Actor;
    proposalId: WorkflowRateProposalId;
    round: number;
    currency: Currency;
    reservationExpiresAt: Date;
    occurredAt: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("propose-rate", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "PRICING") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "rate_proposed",
      actorUserId: input.actor.userId,
      payload: {
        proposalId: input.proposalId,
        round: input.round,
        currency: input.currency,
      },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(
    state,
    events,
    input.actor,
    input.occurredAt,
    input.reservationExpiresAt,
  );
}

export function editRateProposal(
  state: LeadState,
  input: {
    actor: Actor;
    proposalId: WorkflowRateProposalId;
    round: number;
    changes: FieldChange[];
    occurredAt: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("propose-rate", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "PRICING") {
    return Err(fail("invalid_stage"));
  }
  if (!isReservationActive(state, input.occurredAt)) {
    return Err(fail("rate_proposal_expired"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "rate_proposal_corrected",
      actorUserId: input.actor.userId,
      payload: {
        proposalId: input.proposalId,
        round: input.round,
      },
      changes: input.changes,
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt);
}

export function editCommercialScope(
  state: LeadState,
  input: { actor: Actor; changes: FieldChange[]; occurredAt: Date },
): TransitionResult {
  const authz = authorizeLeadAction(
    "edit-commercial-scope",
    input.actor,
    state,
  );
  if (!authz.ok) {
    return authz;
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "commercial_scope_corrected",
      actorUserId: input.actor.userId,
      payload: {},
      changes: input.changes,
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt);
}

export function reviewLead(
  state: LeadState,
  input: {
    actor: Actor;
    rowType: "status" | "priority";
    status: LeadStatus | null;
    priority: LeadPriority | null;
    reason: string;
    occurredAt: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("review", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "QUALIFYING") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [];

  if (input.rowType === "status") {
    if (input.status === null) {
      return Err(fail("invalid_stage"));
    }
    events.push(
      createHistoryEvent({
        leadId: state.id,
        eventType: "lead_status_updated",
        actorUserId: input.actor.userId,
        payload: {
          fromStatus: state.status,
          toStatus: input.status,
          reason: input.reason,
        },
        occurredAt: input.occurredAt,
      }),
    );
  } else {
    if (input.priority === null) {
      return Err(fail("invalid_stage"));
    }
    events.push(
      createHistoryEvent({
        leadId: state.id,
        eventType: "lead_priority_updated",
        actorUserId: input.actor.userId,
        payload: {
          fromPrioridad: state.priority,
          toPrioridad: input.priority,
          reason: input.reason,
        },
        occurredAt: input.occurredAt,
      }),
    );
  }

  if (input.status !== null && input.priority !== null) {
    const toStage = resolveReviewTransition(input.status);
    events.push(
      createHistoryEvent({
        leadId: state.id,
        eventType: "lead_reviewed",
        actorUserId: input.actor.userId,
        payload: {
          status: input.status,
          priority: input.priority,
          reason: input.reason,
          fromStage: state.stage,
          toStage,
        },
        occurredAt: input.occurredAt,
      }),
      createHistoryEvent({
        leadId: state.id,
        eventType: "workflow_stage_changed",
        actorUserId: input.actor.userId,
        payload: { from: state.stage, to: toStage },
        occurredAt: input.occurredAt,
      }),
    );
  }

  return finish(state, events, input.actor, input.occurredAt);
}

export function qualifyLead(
  state: LeadState,
  input: {
    actor: Actor;
    status: LeadStatus;
    priority: LeadPriority;
    reason: string;
    occurredAt: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("review", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "QUALIFYING") {
    return Err(fail("invalid_stage"));
  }

  const toStage = resolveReviewTransition(input.status);

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_status_updated",
      actorUserId: input.actor.userId,
      payload: {
        fromStatus: state.status,
        toStatus: input.status,
        reason: input.reason,
      },
      occurredAt: input.occurredAt,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_priority_updated",
      actorUserId: input.actor.userId,
      payload: {
        fromPrioridad: state.priority,
        toPrioridad: input.priority,
        reason: input.reason,
      },
      occurredAt: input.occurredAt,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_reviewed",
      actorUserId: input.actor.userId,
      payload: {
        status: input.status,
        priority: input.priority,
        reason: input.reason,
        fromStage: state.stage,
        toStage,
      },
      occurredAt: input.occurredAt,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: toStage },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt);
}

export function acceptRate(
  state: LeadState,
  input: { actor: Actor; proposalId: WorkflowRateProposalId; occurredAt: Date },
): TransitionResult {
  const authz = authorizeLeadAction("accept-rate", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "PRICING") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "rate_accepted",
      actorUserId: input.actor.userId,
      payload: { proposalId: input.proposalId },
      occurredAt: input.occurredAt,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "SETUP" },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt, null);
}

export function closeLead(
  state: LeadState,
  input: {
    actor: Actor;
    reason: CloseReason;
    note: string | null;
    occurredAt: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("close-lead", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "PRICING") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_closed",
      actorUserId: input.actor.userId,
      payload: {
        reason: input.reason,
        note: input.note,
        fromStage: state.stage,
      },
      occurredAt: input.occurredAt,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "CLOSED_LOST" },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt, null);
}

export function expireReservation(
  state: LeadState,
  input: { occurredAt: Date },
): TransitionResult {
  if (state.stage !== "PRICING") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_reservation_expired",
      actorUserId: null,
      payload: { fromStage: state.stage },
      occurredAt: input.occurredAt,
    }),
  ];

  const next = applyEvents(state, events, {
    actorUserId: null,
    updatedAt: input.occurredAt,
  });
  return Ok({ next: { ...next, reservationExpiresAt: null }, events });
}

// Reopen pricing without reviving the expired reservation. Back office proposes a replacement.
export function restartQuotation(
  state: LeadState,
  input: { actor: Actor; occurredAt: Date },
): TransitionResult {
  const authz = authorizeLeadAction("restart-quotation", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "EXPIRED") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "PRICING" },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt);
}

export function recordRepLegal(
  state: LeadState,
  input: {
    actor: Actor;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    dni: string;
    telefono: string;
    email: string;
    occurredAt: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("record-rep-legal", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "SETUP") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "rep_legal_recorded",
      actorUserId: input.actor.userId,
      payload: {
        nombres: input.nombres,
        apellidoPaterno: input.apellidoPaterno,
        apellidoMaterno: input.apellidoMaterno,
        dni: input.dni,
        telefono: input.telefono,
        email: input.email,
      },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt);
}

export function addVenueAccounts(
  state: LeadState,
  input: {
    actor: Actor;
    venueId: WorkflowVenueId;
    totalVenues: number;
    fundedVenues: number;
    occurredAt: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("add-venue-accounts", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "SETUP") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_accounts_added",
      actorUserId: input.actor.userId,
      payload: { venueId: input.venueId },
      occurredAt: input.occurredAt,
    }),
  ];

  const completesLastVenue =
    input.totalVenues > 0 && input.fundedVenues + 1 === input.totalVenues;

  // FULFILLMENT begins after affiliation. LIVE requires sale registration.
  if (completesLastVenue) {
    events.push(
      createHistoryEvent({
        leadId: state.id,
        eventType: "workflow_stage_changed",
        actorUserId: input.actor.userId,
        payload: { from: state.stage, to: "FULFILLMENT" },
        occurredAt: input.occurredAt,
      }),
    );
  }

  return finish(state, events, input.actor, input.occurredAt);
}

export function completeFulfillment(
  state: LeadState,
  input: { actor: Actor; orderId: FulfillmentOrderId; occurredAt: Date },
): TransitionResult {
  const authz = authorizeLeadAction("complete-fulfillment", input.actor, state);
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "FULFILLMENT") {
    return Err(fail("invalid_stage"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "fulfillment_completed",
      actorUserId: input.actor.userId,
      payload: { orderId: input.orderId },
      occurredAt: input.occurredAt,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "LIVE" },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(state, events, input.actor, input.occurredAt);
}

export function requestRateRevision(
  state: LeadState,
  input: {
    actor: Actor;
    revisionId: WorkflowRateRevisionId;
    round: number;
    justification: string;
    fileIds: WorkflowRateRevisionFileId[];
    reservationExpiresAt: Date;
    occurredAt: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction(
    "request-rate-revision",
    input.actor,
    state,
  );
  if (!authz.ok) {
    return authz;
  }
  if (state.stage !== "PRICING") {
    return Err(fail("invalid_stage"));
  }

  if (input.round > MAX_RATE_REVISION_ROUNDS) {
    return Err(fail("max_rate_revision_rounds_reached"));
  }
  if (input.fileIds.length < 1) {
    return Err(fail("rate_revision_files_required"));
  }
  if (input.fileIds.length > MAX_RATE_REVISION_FILES) {
    return Err(fail("max_rate_revision_files_exceeded"));
  }
  if (new Set(input.fileIds).size !== input.fileIds.length) {
    return Err(fail("duplicate_rate_revision_file"));
  }

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "rate_revision_requested",
      actorUserId: input.actor.userId,
      payload: {
        revisionId: input.revisionId,
        round: input.round,
        justification: input.justification,
      },
      occurredAt: input.occurredAt,
    }),
  ];

  return finish(
    state,
    events,
    input.actor,
    input.occurredAt,
    input.reservationExpiresAt,
  );
}
