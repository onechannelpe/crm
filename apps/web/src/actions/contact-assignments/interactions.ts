"use server";

import { CONTACT_ASSIGNMENT_CALL_OUTCOMES } from "~/actions/contact-assignments/contracts";
import type { CompleteContactAssignmentCallResult } from "~/actions/contact-assignments/contracts";
import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import { serverRuntime } from "~/server/runtime";
import {
  asAssignmentId,
  asContactId,
  isAssignmentId,
  isContactId,
} from "~/server/shared/ids";
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
  assignmentId: string;
  contactId: string;
  outcome: string;
}): {
  assignmentId: ReturnType<typeof asAssignmentId>;
  contactId: ReturnType<typeof asContactId>;
  outcome: CallOutcome;
} {
  if (!isAssignmentId(input.assignmentId)) {
    throw new Error("Invalid assignmentId");
  }
  if (!isContactId(input.contactId)) {
    throw new Error("Invalid contactId");
  }
  return {
    assignmentId: asAssignmentId(input.assignmentId),
    contactId: asContactId(input.contactId),
    outcome: parseCallOutcome(input.outcome),
  };
}

export async function completeContactAssignmentCall(
  assignmentId: string,
  contactId: string,
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
          branchId: ctx.actor.branchId,
          assignmentId: parsedInput.assignmentId,
          contactId: parsedInput.contactId,
          outcome: parsedInput.outcome,
          notes: notes?.trim() ? notes : null,
        },
        serverRuntime.contactAssignments.interactionRunner,
      ),
  });
}
