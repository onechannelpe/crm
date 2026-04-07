"use server";

import { assertPositiveInt } from "~/lib/contracts/guards";
import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import type { CompleteContactAssignmentCallResult } from "~/server/contact-assignments/application/types/complete-contact-assignment-call";
import { runContactAssignmentInteraction } from "~/server/contact-assignments/infrastructure/interaction-context";
import { runAction } from "~/server/shared/action-runtime";

function parseCompleteContactAssignmentCallInput(input: {
  assignmentId: number;
  contactId: number;
}): { assignmentId: number; contactId: number } {
  return {
    assignmentId: assertPositiveInt(input.assignmentId, "assignmentId"),
    contactId: assertPositiveInt(input.contactId, "contactId"),
  };
}

export async function completeContactAssignmentCall(
  assignmentId: number,
  contactId: number,
  outcome: string,
  notes?: string,
): Promise<CompleteContactAssignmentCallResult> {
  const parsedInput = parseCompleteContactAssignmentCallInput({
    assignmentId,
    contactId,
  });
  return runAction({
    actionName: "contact_assignments.complete_call",
    permission: "lead:work",
    input: {
      assignmentId: parsedInput.assignmentId,
      contactId: parsedInput.contactId,
      outcome,
    },
    execute: (ctx) =>
      completeContactAssignmentCallUseCase(
        {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: ctx.actor.branchId,
          assignmentId: parsedInput.assignmentId,
          contactId: parsedInput.contactId,
          outcome,
          notes: notes?.trim() ? notes : null,
        },
        runContactAssignmentInteraction,
      ),
  });
}
