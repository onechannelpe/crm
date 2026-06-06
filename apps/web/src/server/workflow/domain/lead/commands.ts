import type {
  AbonoBank,
  LeadCallOutcome,
  LeadPriority,
  LeadStatus,
  Moneda,
} from "~/contracts/workflow/vocabulary";
import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RequiredLeadText } from "~/server/workflow/parsers";

import { createHistoryEvent } from "../history";
import { resolveReviewTransition } from "../workflow";
import type { LeadEvent } from "./events";
import { invalidLeadInput, invalidLeadStage } from "./lead-errors";
import {
  authorizeLeadAction,
  MAX_NEGOTIATION_FILES,
  MAX_NEGOTIATION_ROUNDS,
} from "./policy";
import { applyEvents } from "./reducer";
import type { LeadState } from "./state";

type Actor = { userId: number; role: Role };
type TransitionResult = Result<
  { next: LeadState; events: LeadEvent[] },
  DomainError
>;

function conflict(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("conflict", code, message));
}

function finish(
  state: LeadState,
  events: LeadEvent[],
  actor: Actor,
  now: number,
): TransitionResult {
  return Ok({
    next: applyEvents(state, events, { actorUserId: actor.userId, now }),
    events,
  });
}

export function reviewLead(
  state: LeadState,
  input: {
    actor: Actor;
    status: LeadStatus;
    prioridad: LeadPriority;
    reason: RequiredLeadText;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("review", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "QUALIFYING") return invalidLeadStage();

  const nextStage = resolveReviewTransition({
    status: input.status,
    prioridad: input.prioridad,
  });

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "lead_reviewed",
      actorUserId: input.actor.userId,
      payload: {
        status: input.status,
        prioridad: input.prioridad,
        reason: input.reason,
        fromStage: state.stage,
        toStage: nextStage,
      },
      occurredAt: input.now,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: nextStage },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function reassignLead(
  state: LeadState,
  input: { actor: Actor; toExecutiveId: number; now: number },
): TransitionResult {
  const authz = authorizeLeadAction("reassign", input.actor, state);
  if (!authz.ok) return authz;

  if (state.executiveId === input.toExecutiveId) {
    return invalidLeadInput(
      "same_executive",
      "Lead is already assigned to the selected executive",
    );
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
  input: { actor: Actor; body: RequiredLeadText; now: number },
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

export function approveForSale(
  state: LeadState,
  input: { actor: Actor; now: number },
): TransitionResult {
  const authz = authorizeLeadAction("approve-for-sale", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "QUOTED") return invalidLeadStage();

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "sale_approved",
      actorUserId: input.actor.userId,
      payload: null,
      occurredAt: input.now,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "SETUP_PLAN" },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function requestQuotation(
  state: LeadState,
  input: { actor: Actor; now: number },
): TransitionResult {
  const authz = authorizeLeadAction("complete-scoping", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SCOPING") return invalidLeadStage();

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "quotation_requested",
      actorUserId: input.actor.userId,
      payload: null,
      occurredAt: input.now,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "QUOTING" },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function createQuotation(
  state: LeadState,
  input: {
    actor: Actor;
    quotationId: string;
    version: number;
    moneda: Moneda;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("create-quotation", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "QUOTING") return invalidLeadStage();

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "quotation_created",
      actorUserId: input.actor.userId,
      payload: {
        quotationId: input.quotationId,
        version: input.version,
        moneda: input.moneda,
      },
      occurredAt: input.now,
    }),
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "QUOTED" },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function saveCommercialScope(
  state: LeadState,
  input: {
    actor: Actor;
    proveedorActual: string;
    tasaActual: number;
    gpv: number;
    ticket: number;
    giroNegocio: string;
    abonoBank: AbonoBank;
    posTotal: number;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("complete-scoping", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SCOPING") return invalidLeadStage();

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "commercial_scope_saved",
      actorUserId: input.actor.userId,
      payload: {
        proveedorActual: input.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        giroNegocio: input.giroNegocio,
        abonoBank: input.abonoBank,
        posTotal: input.posTotal,
      },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
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
  const authz = authorizeLeadAction("complete-scoping", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP_EXECUTION") return invalidLeadStage();

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
  if (state.stage !== "SETUP_EXECUTION") return invalidLeadStage();

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
  if (state.stage !== "SETUP_EXECUTION") return invalidLeadStage();

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
  if (state.stage !== "SETUP_EXECUTION") return invalidLeadStage();

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

export function startSetupExecution(
  state: LeadState,
  input: { actor: Actor; now: number },
): TransitionResult {
  const authz = authorizeLeadAction("complete-scoping", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "SETUP_PLAN") return invalidLeadStage();

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "SETUP_EXECUTION" },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}

export function requestRateNegotiation(
  state: LeadState,
  input: {
    actor: Actor;
    negotiationRequestId: string;
    round: number;
    negotiationRequestCount: number;
    artifactCount: number;
    now: number;
  },
): TransitionResult {
  const authz = authorizeLeadAction("request-negotiation", input.actor, state);
  if (!authz.ok) return authz;
  if (state.stage !== "QUOTED") return invalidLeadStage();

  if (input.negotiationRequestCount >= MAX_NEGOTIATION_ROUNDS) {
    return conflict(
      "max_negotiation_rounds_reached",
      `Maximum of ${MAX_NEGOTIATION_ROUNDS} negotiation rounds allowed`,
    );
  }
  if (input.artifactCount > MAX_NEGOTIATION_FILES) {
    return Err(
      domainError(
        "validation",
        "max_negotiation_files_exceeded",
        `Maximum of ${MAX_NEGOTIATION_FILES} negotiation files allowed`,
      ),
    );
  }

  const events: LeadEvent[] = [
    createHistoryEvent({
      leadId: state.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actor.userId,
      payload: { from: state.stage, to: "QUOTING" },
      occurredAt: input.now,
    }),
  ];

  return finish(state, events, input.actor, input.now);
}
