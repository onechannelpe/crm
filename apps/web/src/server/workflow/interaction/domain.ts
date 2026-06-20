import type { LeadCallOutcome } from "~/contracts/workflow/vocabulary";
import type { Role } from "~/lib/auth/access/rbac";
import { type DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import type { LeadEvent } from "~/server/workflow/lead/domain/events";
import { createHistoryEvent } from "~/server/workflow/lead/domain/history";
import { authorizeLeadAction } from "~/server/workflow/lead/domain/policy";
import type { LeadState } from "~/server/workflow/lead/domain/state";

type Actor = { userId: number; role: Role };

// Interactions are timeline facts, not state transitions. They authorize against
// the lead and emit one event, but they never evolve the aggregate or take its
// version: two executives logging activity on the same lead must not collide on
// optimistic concurrency. The write path appends these events without the
// version-checked lead update.
export function recordNote(
  state: LeadState,
  input: { actor: Actor; body: string; now: number },
): Result<LeadEvent[], DomainError> {
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
): Result<LeadEvent[], DomainError> {
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
