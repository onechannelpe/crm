import type { FieldChange } from "~/contracts/events";
import {
  MAX_RATE_REVISION_FILES,
  MAX_RATE_REVISION_ROUNDS,
} from "~/contracts/workflow/limits";
import type {
  LeadCallOutcome,
  Currency,
} from "~/contracts/workflow/vocabulary";
import type { Role } from "~/lib/auth/access/rbac";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../history";
import type { LeadEvent } from "./events";
import { authorizeLeadAction } from "./policy";
import { applyEvents } from "./reducer";
import { isReservationActive } from "./reservation";
import type { LeadState } from "./state";

type Actor = { userId: number; role: Role };
type TransitionResult = Result<
  { next: LeadState; events: LeadEvent[] },
  DomainError
>;

// reservationExpiresAt is an explicit override: `undefined` leaves the existing
// hold untouched, a number re-stamps it (a fresh quotation round), and `null`
// clears it (the lead left the priced phase).
function finish(
  state: LeadState,
  events: LeadEvent[],
  actor: Actor,
  now: number,
  reservationExpiresAt?: number | null,
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

export function reassignLead(
  state: LeadState,
  input: { actor: Actor; toExecutiveId: number; now: number },
): TransitionResult {
  const authz = authorizeLeadAction("reassign", input.actor, state);
  if (!authz.ok) return authz;

  if (state.executiveId === input.toExecutiveId) {
    return Err(fail("same_executive"));
  }

  const events: LeadEvent[] = [
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

export function addNote(
  state: LeadState,
  input: { actor: Actor; body: string; now: number },
): TransitionResult {
  const authz = authorizeLeadAction("interact", input.actor, state);
  if (!authz.ok) return authz;

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "note_added",
      actorUserId: input.actor.userId,
      payload: { body: input.body },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function logCall(
  state: LeadState,
  input: {
    actor: Actor;
    outcome: LeadCallOutcome;
    notes: string | null;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("interact", input.actor, state);
  if (!authz.ok) return authz;

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "call_logged",
      actorUserId: input.actor.userId,
      payload: { outcome: input.outcome, notes: input.notes },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

// Back office proposes the Culqi rate. The lead stays in PRICING; the proposal
// row carries the numbers. The executive then accepts or requests a revision.
export function proposeRate(
  state: LeadState,
  input: {
    actor: Actor;
    proposalId: string;
    round: number;
    currency: Currency;
    reservationExpiresAt: number;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("propose-rate", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));

  const events: LeadEvent[] = [
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

  // Each quotation round resets the RUC hold.
  return finish(
    state,
    events,
    input.actor,
    input.now,
    input.reservationExpiresAt,
  );
}

// Back office corrects a pending proposal's numbers in place. The command layer
// owns the proposal entity (it resolves the latest pending proposal and diffs
// old vs new); the domain owns every lead-state rule: who may correct, the
// stage, and that the RUC hold is still live. The field-level changes ride on
// the event so the activity feed and the audit log both show exactly what moved.
export function editRateProposal(
  state: LeadState,
  input: {
    actor: Actor;
    proposalId: string;
    round: number;
    changes: FieldChange[];
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("propose-rate", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));
  if (!isReservationActive(state, input.now)) {
    return Err(fail("rate_proposal_expired"));
  }

  const events: LeadEvent[] = [
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

// Inline correction of the commercial scope captured at registration. No stage
// transition; the owning executive rewrites the profile fields.
export function editCommercialScope(
  state: LeadState,
  input: { actor: Actor; changes: FieldChange[]; now: number },
): TransitionResult {
  const authz = authorizeLeadAction(
    "edit-commercial-scope",
    input.actor,
    state,
  );
  if (!authz.ok) return authz;

  const events: LeadEvent[] = [
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

// The executive confirms the client agreed to the proposed rate.
export function acceptRate(
  state: LeadState,
  input: { actor: Actor; proposalId: string; now: number },
): TransitionResult {
  const authz = authorizeLeadAction("accept-rate", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));

  const events: LeadEvent[] = [
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

// The sweep (or the registration guard) expires a lapsed hold: the lead becomes
// terminal EXPIRED and releases its RUC. Runs as the system, so there is no
// actor and no authorization check.
export function expireReservation(
  state: LeadState,
  input: { now: number },
): TransitionResult {
  if (state.stage !== "PRICING") return Err(fail("invalid_stage"));

  const events: LeadEvent[] = [
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
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("record-rep-legal", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP") return Err(fail("invalid_stage"));

  const events: LeadEvent[] = [
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

export function createVenue(
  state: LeadState,
  input: {
    actor: Actor;
    venueId: string;
    nombreComercial: string;
    posQuantity: number;
    direccion: string;
    referencia: string;
    distrito: string;
    provincia: string;
    departamento: string;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("create-venue", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP") return Err(fail("invalid_stage"));

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_added",
      actorUserId: input.actor.userId,
      payload: {
        venueId: input.venueId,
        nombreComercial: input.nombreComercial,
      },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function updateVenue(
  state: LeadState,
  input: {
    actor: Actor;
    venueId: string;
    nombreComercial: string;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("update-venue", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP") return Err(fail("invalid_stage"));

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_updated",
      actorUserId: input.actor.userId,
      payload: {
        venueId: input.venueId,
        nombreComercial: input.nombreComercial,
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
    venueId: string;
    shouldTransitionToLive: boolean;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("add-venue-accounts", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP") return Err(fail("invalid_stage"));

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "venue_accounts_added",
      actorUserId: input.actor.userId,
      payload: { venueId: input.venueId },
      occurredAt: input.now,
    }),
  ];

  if (input.shouldTransitionToLive) {
    events.push(
      createHistoryEvent({
        leadId: state.id,
        eventType: "workflow_stage_changed",
        actorUserId: input.actor.userId,
        payload: { from: state.stage, to: "LIVE" },
        occurredAt: input.now,
      }),
    );
  }

  return finish(state, events, input.actor, input.now);
}

// The executive rejects the current proposal and asks for a new rate. The lead
// stays in PRICING (no stage bounce); back office will propose another round.
export function requestRateRevision(
  state: LeadState,
  input: {
    actor: Actor;
    revisionId: string;
    round: number;
    justification: string;
    artifactIds: string[];
    reservationExpiresAt: number;
    now: number;
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

  const events: LeadEvent[] = [
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

  // Requesting a revision is a fresh round, so it resets the RUC hold.
  return finish(
    state,
    events,
    input.actor,
    input.now,
    input.reservationExpiresAt,
  );
}
