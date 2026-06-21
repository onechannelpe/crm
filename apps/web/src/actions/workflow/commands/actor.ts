import type { AuthSession } from "~/lib/auth/access/session-types";
import type { WorkflowActor } from "~/server/workflow/actor";

export function workflowActor(actor: AuthSession): WorkflowActor {
  return {
    userId: actor.userId,
    role: actor.role,
    branchId: actor.branchId,
  };
}
