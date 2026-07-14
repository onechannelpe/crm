import type { Kysely } from "kysely";

import type { Database } from "../../../types";
import { stableSeedId } from "../../shared/stable-id";
import type { CompiledLead } from "../compiler";

interface EventDraft {
  leadId: string;
  type: string;
  actorUserId: string | null;
  subjectUserId: string | null;
  payload: Record<string, unknown>;
  occurredAtMs: number;
}

// Projects each compiled story into the complete event stream expected from
// the same user actions in the application.
export async function persistWorkflowHistoryEvents(
  db: Kysely<Database>,
  now: number,
  day: number,
  leads: readonly CompiledLead[],
): Promise<void> {
  const drafts = leads.flatMap((lead) => buildLeadEvents(lead, now, day));
  if (drafts.length === 0) return;

  await db
    .insertInto("events")
    .values(
      drafts.map((event, index) => ({
        id: stableSeedId(
          `lead-event:${event.leadId}:${event.occurredAtMs}:${event.type}:${index}`,
        ),
        entity_type: "lead",
        entity_id: event.leadId,
        type: event.type,
        actor_user_id: event.actorUserId,
        subject_user_id: event.subjectUserId,
        payload_json: JSON.stringify(event.payload),
        changes_json: null,
        occurred_at: new Date(event.occurredAtMs),
      })),
    )
    .execute();
}

function buildLeadEvents(
  lead: CompiledLead,
  now: number,
  day: number,
): EventDraft[] {
  const { spec } = lead;
  const at = (offsetDays: number, nudgeMs = 0) =>
    now - offsetDays * day + nudgeMs;
  const events: EventDraft[] = [];
  const push = (
    type: string,
    payload: Record<string, unknown>,
    occurredAtMs: number,
    actors: { actor?: string | null; subject?: string | null } = {},
  ) =>
    events.push({
      leadId: lead.leadId,
      type,
      actorUserId: actors.actor ?? null,
      subjectUserId: actors.subject ?? null,
      payload,
      occurredAtMs,
    });

  push(
    "lead_registered",
    { ruc: spec.org.ruc, toStage: "QUALIFYING" },
    at(spec.createdOffsetDays),
    { actor: spec.createdBy },
  );
  push(
    "lead_assigned",
    { executiveId: spec.executiveId },
    at(spec.createdOffsetDays, 1_000),
    { actor: spec.createdBy, subject: spec.executiveId },
  );

  if (spec.review) {
    push(
      "lead_status_updated",
      {
        fromStatus: null,
        toStatus: spec.review.status,
        reason: spec.review.reason,
      },
      at(spec.review.offsetDays),
      { actor: spec.review.by },
    );
    push(
      "lead_priority_updated",
      {
        fromPrioridad: null,
        toPrioridad: spec.review.priority,
        reason: spec.review.reason,
      },
      at(spec.review.offsetDays, 25),
      { actor: spec.review.by },
    );
    push(
      "lead_reviewed",
      {
        status: spec.review.status,
        priority: spec.review.priority,
        reason: spec.review.reason,
        fromStage: "QUALIFYING",
        toStage: spec.review.toStage,
      },
      at(spec.review.offsetDays, 50),
      { actor: spec.review.by },
    );
    push(
      "workflow_stage_changed",
      { from: "QUALIFYING", to: spec.review.toStage },
      at(spec.review.offsetDays, 100),
    );
  }

  (spec.proposals ?? []).forEach((proposal, index) => {
    push(
      "rate_proposed",
      {
        proposalId: lead.rateProposalIds[index],
        round: proposal.round,
        currency: proposal.currency,
      },
      at(proposal.proposedOffsetDays),
      { actor: proposal.proposedBy },
    );
    if (
      proposal.outcome === "accepted" &&
      proposal.decidedOffsetDays !== undefined
    ) {
      push(
        "rate_accepted",
        { proposalId: lead.rateProposalIds[index] },
        at(proposal.decidedOffsetDays),
        { actor: proposal.acceptedBy ?? spec.executiveId },
      );
    }
    if (
      proposal.outcome === "revision_requested" &&
      proposal.decidedOffsetDays !== undefined
    ) {
      push(
        "rate_revision_requested",
        {
          revisionId: lead.rateRevisionIds[index],
          round: proposal.round,
          justification: "El comercio solicita una tarifa más competitiva",
        },
        at(proposal.decidedOffsetDays),
        { actor: spec.executiveId },
      );
    }
  });

  let fromStage = "PRICING";
  for (const advance of spec.advances ?? []) {
    push(
      "workflow_stage_changed",
      { from: fromStage, to: advance.to },
      at(advance.offsetDays, 100),
    );
    fromStage = advance.to;
  }

  if (spec.venue) {
    push(
      "venue_added",
      { venueId: lead.venueId, tradeName: spec.venue.tradeName },
      at(spec.venue.createdOffsetDays),
      { actor: spec.venue.createdBy },
    );
    push(
      "venue_accounts_added",
      { venueId: lead.venueId },
      at(Math.max(0, spec.venue.createdOffsetDays - 2)),
      { actor: spec.venue.createdBy },
    );
  }

  if (spec.legalRep) {
    push(
      "rep_legal_recorded",
      {
        nombres: spec.legalRep.names,
        apellidoPaterno: spec.legalRep.firstSurname,
        apellidoMaterno: spec.legalRep.secondSurname,
        dni: spec.legalRep.dni,
        telefono: spec.legalRep.phone,
        email: spec.legalRep.email,
      },
      at(spec.legalRep.offsetDays),
      { actor: spec.executiveId },
    );
  }

  if (spec.close) {
    push(
      "lead_closed",
      {
        reason: spec.close.reason,
        note: spec.close.note,
        fromStage: "PRICING",
      },
      at(spec.close.offsetDays),
      { actor: spec.close.by },
    );
    push(
      "workflow_stage_changed",
      { from: "PRICING", to: "CLOSED_LOST" },
      at(spec.close.offsetDays, 100),
      { actor: spec.close.by },
    );
  }

  if (spec.expiredOffsetDays !== undefined) {
    push(
      "lead_reservation_expired",
      { fromStage: "PRICING" },
      at(spec.expiredOffsetDays),
    );
  }

  return events;
}
