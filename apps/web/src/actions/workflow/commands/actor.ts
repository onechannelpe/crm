import type { AuthSession } from "~/lib/auth/access/session-types";
import type { WorkflowActor } from "~/server/workflow/actor";

/**
 * Projects the authenticated session down to the fields a workflow command
 * needs. Commands take exactly userId, role, and branchId, so the rest of the
 * session never crosses into the domain.
 */
export function workflowActor(actor: AuthSession): WorkflowActor {
  return {
    userId: actor.userId,
    role: actor.role,
    branchId: actor.branchId,
  };
}
