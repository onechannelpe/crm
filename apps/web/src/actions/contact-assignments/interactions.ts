"use server";

import { assertPositiveInt } from "~/lib/contracts/guards";
import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import type {
  CompleteContactAssignmentCallResult,
  ContactAssignmentCallOutcome,
} from "~/server/contact-assignments/application/contracts";
import { CONTACT_ASSIGNMENT_CALL_OUTCOMES } from "~/server/contact-assignments/application/contracts";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

function parseCallOutcome(value: string): ContactAssignmentCallOutcome {
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
  outcome: ContactAssignmentCallOutcome;
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
    access: { kind: "permission", permission: "lead:work" },
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
          assignmentId: parsedInput.assignmentId,
          contactId: parsedInput.contactId,
          outcome: parsedInput.outcome,
          notes: notes?.trim() ? notes : null,
        },
        getServerRuntime().contactAssignments.interactionUow,
      ),
  });
}
