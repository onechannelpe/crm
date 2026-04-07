"use server";

import { assertPositiveInt } from "~/lib/contracts/guards";
import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import type { CompleteContactAssignmentCallResult } from "~/server/contact-assignments/application/contracts";
import { CONTACT_ASSIGNMENT_CALL_OUTCOMES } from "~/server/contact-assignments/domain/assignment";
import { runContactAssignmentInteraction } from "~/server/contact-assignments/infrastructure/interaction-context";
import { runAction } from "~/server/shared/action-runtime";

type CallOutcome = (typeof CONTACT_ASSIGNMENT_CALL_OUTCOMES)[number];

function parseCallOutcome(value: string): CallOutcome {
  for (const outcome of CONTACT_ASSIGNMENT_CALL_OUTCOMES) {
    if (outcome === value) {
      return outcome;
    }
  }
  throw new Error("Invalid call outcome");
}

function parseCompleteContactAssignmentCallInput(input: {
  assignmentId: number;
  contactId: number;
  outcome: string;
}): {
  assignmentId: number;
  contactId: number;
  outcome: CallOutcome;
} {
  return {
    assignmentId: assertPositiveInt(input.assignmentId, "assignmentId"),
    contactId: assertPositiveInt(input.contactId, "contactId"),
    outcome: parseCallOutcome(input.outcome),
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
    outcome,
  });
  return runAction({
    actionName: "contact_assignments.complete_call",
    permission: "lead:work",
    input: {
      assignmentId: parsedInput.assignmentId,
      contactId: parsedInput.contactId,
      outcome: parsedInput.outcome,
    },
    execute: (ctx) =>
      completeContactAssignmentCallUseCase(
        {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: ctx.actor.branchId,
          assignmentId: parsedInput.assignmentId,
          contactId: parsedInput.contactId,
          outcome: parsedInput.outcome,
          notes: notes?.trim() ? notes : null,
        },
        runContactAssignmentInteraction,
      ),
  });
}
