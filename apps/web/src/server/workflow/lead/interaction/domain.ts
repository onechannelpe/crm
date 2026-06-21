import type { LeadCallOutcome } from "~/contracts/workflow/vocabulary";
import type { Role } from "~/lib/auth/access/rbac";
import { type DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import {
  createHistoryEvent,
  type LeadHistoryEventDraft,
} from "~/server/workflow/lead/domain/history";
import { authorizeLeadAction } from "~/server/workflow/lead/domain/policy";
import type { LeadState } from "~/server/workflow/lead/domain/state";

type Actor = { userId: number; role: Role };

export function recordNote(
  state: LeadState,
  input: { actor: Actor; body: string; now: number },
): Result<LeadHistoryEventDraft[], DomainError> {
  const authz = authorizeLeadAction("interact", input.actor, state);
  if (!authz.ok) return authz;

  return Ok([
    createHistoryEvent({
      leadId: state.id,
      eventType: "note_added",
      actorUserId: input.actor.userId,
      payload: { body: input.body },
      occurredAt: input.now,
    }),
  ]);
}

export function recordCall(
  state: LeadState,
  input: {
    actor: Actor;
    outcome: LeadCallOutcome;
    notes: string | null;
    now: number;
  },
): Result<LeadHistoryEventDraft[], DomainError> {
  const authz = authorizeLeadAction("interact", input.actor, state);
  if (!authz.ok) return authz;

  return Ok([
    createHistoryEvent({
      leadId: state.id,
      eventType: "call_logged",
      actorUserId: input.actor.userId,
      payload: { outcome: input.outcome, notes: input.notes },
      occurredAt: input.now,
    }),
  ]);
}
