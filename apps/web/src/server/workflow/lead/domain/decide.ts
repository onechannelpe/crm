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
import { fail, type DomainError } from "~/server/shared/domain-error";
import type {
  FulfillmentOrderId,
  UserId,
  WorkflowArtifactId,
  WorkflowRateProposalId,
  WorkflowRateRevisionId,
  WorkflowVenueId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";

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
  now: Date,
  reservationExpiresAt?: Date | null,
): TransitionResult {
  const next = applyEvents(state, events, { actorUserId: actor.userId, now });
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
  input: { actor: Actor; now: Date },
): TransitionResult {
  const authz = authorizeLeadAction("delete", input.actor, state);
  if (!authz.ok) return authz;

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_deleted",
      actorUserId: input.actor.userId,
      payload: {},
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function reassignLead(
  state: LeadState,
  input: { actor: Actor; toExecutiveId: UserId; now: Date },
): TransitionResult {
  const authz = authorizeLeadAction("reassign", input.actor, state);
  if (!authz.ok) return authz;

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
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function proposeRate(
  state: LeadState,
  input: {
    actor: Actor;
    proposalId: WorkflowRateProposalId;
    round: number;
    currency: Currency;
    reservationExpiresAt: Date;
    now: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("propose-rate", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));

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
      occurredAt: input.now,
    }),
  ];

  return finish(
    state,
    events,
    input.actor,
    input.now,
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
    now: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("propose-rate", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));
  if (!isReservationActive(state, input.now)) {
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
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function editCommercialScope(
  state: LeadState,
  input: { actor: Actor; changes: FieldChange[]; now: Date },
): TransitionResult {
  const authz = authorizeLeadAction(
    "edit-commercial-scope",
    input.actor,
    state,
  );
  if (!authz.ok) return authz;

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "commercial_scope_corrected",
      actorUserId: input.actor.userId,
      payload: {},
      changes: input.changes,
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function reviewLead(
  state: LeadState,
  input: {
    actor: Actor;
    rowType: "status" | "priority";
    status: LeadStatus | null;
    priority: LeadPriority | null;
    reason: string;
    now: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("review", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "QUALIFYING") return Err(fail("invalid_stage"));

  const events: LeadHistoryEventDraft[] = [];

  if (input.rowType === "status") {
    if (input.status === null) return Err(fail("invalid_stage"));
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
        occurredAt: input.now,
      }),
    );
  } else {
    if (input.priority === null) return Err(fail("invalid_stage"));
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
        occurredAt: input.now,
      }),
    );
  }

  if (input.status !== null && input.priority !== null) {
    const toStage = resolveReviewTransition({
      status: input.status,
      priority: input.priority,
    });
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
        occurredAt: input.now,
      }),
      createHistoryEvent({
        leadId: state.id,
        eventType: "workflow_stage_changed",
        actorUserId: input.actor.userId,
        payload: { from: state.stage, to: toStage },
        occurredAt: input.now,
      }),
    );
  }

  return finish(state, events, input.actor, input.now);
}

export function acceptRate(
  state: LeadState,
  input: { actor: Actor; proposalId: WorkflowRateProposalId; now: Date },
): TransitionResult {
  const authz = authorizeLeadAction("accept-rate", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "rate_accepted",
      actorUserId: input.actor.userId,
      payload: { proposalId: input.proposalId },
      occurredAt: input.now,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "SETUP" },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now, null);
}

// Available throughout PRICING (a client can decline before or after a rate
// arrives). Third outcome alongside accept-rate and request-rate-revision.
export function closeLead(
  state: LeadState,
  input: {
    actor: Actor;
    reason: CloseReason;
    note: string | null;
    now: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("close-lead", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));

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
      occurredAt: input.now,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "CLOSED_LOST" },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now, null);
}

export function expireReservation(
  state: LeadState,
  input: { now: Date },
): TransitionResult {
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_reservation_expired",
      actorUserId: null,
      payload: { fromStage: state.stage },
      occurredAt: input.now,
    }),
  ];

  const next = applyEvents(state, events, {
    actorUserId: null,
    now: input.now,
  });
  return Ok({ next: { ...next, reservationExpiresAt: null }, events });
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
    now: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("record-rep-legal", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP") return Err(fail("invalid_stage"));

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
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function addVenueAccounts(
  state: LeadState,
  input: {
    actor: Actor;
    venueId: WorkflowVenueId;
    totalVenues: number;
    fundedVenues: number;
    now: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction("add-venue-accounts", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP") return Err(fail("invalid_stage"));

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_accounts_added",
      actorUserId: input.actor.userId,
      payload: { venueId: input.venueId },
      occurredAt: input.now,
    }),
  ];

  const completesLastVenue =
    input.totalVenues > 0 && input.fundedVenues + 1 === input.totalVenues;

  // Hand off to fulfillment once affiliation is complete. LIVE later means
  // the sale is registered, not that the form is filled.
  if (completesLastVenue) {
    events.push(
      createHistoryEvent({
        leadId: state.id,
        eventType: "workflow_stage_changed",
        actorUserId: input.actor.userId,
        payload: { from: state.stage, to: "FULFILLMENT" },
        occurredAt: input.now,
      }),
    );
  }

  return finish(state, events, input.actor, input.now);
}

// Emitted by the register-sale handoff alongside the per-unit service
// references.
export function completeFulfillment(
  state: LeadState,
  input: { actor: Actor; orderId: FulfillmentOrderId; now: Date },
): TransitionResult {
  const authz = authorizeLeadAction("complete-fulfillment", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "FULFILLMENT") return Err(fail("invalid_stage"));

  const events: LeadHistoryEventDraft[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "fulfillment_completed",
      actorUserId: input.actor.userId,
      payload: { orderId: input.orderId },
      occurredAt: input.now,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "LIVE" },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function requestRateRevision(
  state: LeadState,
  input: {
    actor: Actor;
    revisionId: WorkflowRateRevisionId;
    round: number;
    justification: string;
    artifactIds: WorkflowArtifactId[];
    reservationExpiresAt: Date;
    now: Date;
  },
): TransitionResult {
  const authz = authorizeLeadAction(
    "request-rate-revision",
    input.actor,
    state,
  );
  if (!authz.ok) return authz;
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));

  if (input.round > MAX_RATE_REVISION_ROUNDS) {
    return Err(fail("max_rate_revision_rounds_reached"));
  }
  if (input.artifactIds.length < 1) {
    return Err(fail("rate_revision_files_required"));
  }
  if (input.artifactIds.length > MAX_RATE_REVISION_FILES) {
    return Err(fail("max_rate_revision_files_exceeded"));
  }
  if (new Set(input.artifactIds).size !== input.artifactIds.length) {
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
      occurredAt: input.now,
    }),
  ];

  return finish(
    state,
    events,
    input.actor,
    input.now,
    input.reservationExpiresAt,
  );
}
