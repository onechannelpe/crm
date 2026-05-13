"use server";

import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import type {
  CompleteContactAssignmentCallResult,
  ContactAssignmentCallOutcome,
} from "~/server/contact-assignments/application/contracts";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export type CompleteContactAssignmentCallInput = {
  assignmentId: number;
  contactId: number;
  outcome: ContactAssignmentCallOutcome;
  notes?: string | null;
};

export async function completeContactAssignmentCall(
  input: CompleteContactAssignmentCallInput,
): Promise<CompleteContactAssignmentCallResult> {
  return runAction({
    actionName: "contact_assignments.complete_call",
    access: { kind: "permission", permission: "lead:work" },
    input,
    execute: (ctx) =>
      completeContactAssignmentCallUseCase(
        {
          actorUserId: ctx.actor.userId,
          assignmentId: input.assignmentId,
          contactId: input.contactId,
          outcome: input.outcome,
          notes: input.notes?.trim() ? input.notes : null,
        },
        getServerRuntime().contactAssignments.interactionUow,
      ),
  });
}
