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
  const authz = authorizeLeadAction("add-note", input.actor, state);
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
