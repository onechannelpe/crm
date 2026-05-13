"use server";

import { assertPositiveInt } from "~/lib/contracts/guards";
import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import type {
  CompleteContactAssignmentCallResult,
  ContactAssignmentCallOutcome,
} from "~/server/contact-assignments/application/contracts";
import { CONTACT_ASSIGNMENT_CALL_OUTCOMES } from "~/server/contact-assignments/application/contracts";
import { getServerRuntime } from "~/server/runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runAction } from "~/server/shared/action-runtime";
import { Err, Ok, type Result } from "~/server/shared/result";

function parseCallOutcome(
  value: string,
): Result<ContactAssignmentCallOutcome, DomainError> {
  for (const outcome of CONTACT_ASSIGNMENT_CALL_OUTCOMES) {
    if (outcome === value) {
      return Ok(outcome);
    }
  }
  return Err(
    domainError(
      "validation",
      "contact_assignment.call_outcome.invalid",
      "Invalid call outcome",
    ),
  );
}

type CompleteCallInput = {
  assignmentId: number;
  contactId: number;
  outcome: ContactAssignmentCallOutcome;
};

function parseFieldAsPositiveInt(
  value: number,
  fieldName: "assignmentId" | "contactId",
): Result<number, DomainError> {
  try {
    return Ok(assertPositiveInt(value, fieldName));
  } catch (error) {
    return Err(
      domainError(
        "validation",
        `contact_assignment.${fieldName}.invalid`,
        error instanceof Error
          ? error.message
          : `${fieldName} must be a positive integer`,
      ),
    );
  }
}

function parseCompleteCallInput(input: {
  assignmentId: number;
  contactId: number;
  outcome: string;
}): Result<CompleteCallInput, DomainError> {
  const assignmentIdResult = parseFieldAsPositiveInt(
    input.assignmentId,
    "assignmentId",
  );
  if (!assignmentIdResult.ok) return assignmentIdResult;

  const contactIdResult = parseFieldAsPositiveInt(input.contactId, "contactId");
  if (!contactIdResult.ok) {
    return contactIdResult;
  }

  const outcomeResult = parseCallOutcome(input.outcome);
  if (!outcomeResult.ok) {
    return outcomeResult;
  }

  return Ok({
    assignmentId: assignmentIdResult.value,
    contactId: contactIdResult.value,
    outcome: outcomeResult.value,
  });
}

export async function completeContactAssignmentCall(
  assignmentId: number,
  contactId: number,
  outcome: string,
  notes?: string,
): Promise<CompleteContactAssignmentCallResult> {
  return runAction({
    actionName: "contact_assignments.complete_call",
    access: { kind: "permission", permission: "lead:work" },
    input: { assignmentId, contactId, outcome },
    execute: (ctx) => {
      const parsedInput = parseCompleteCallInput({
        assignmentId,
        contactId,
        outcome,
      });
      if (!parsedInput.ok) {
        return Promise.resolve(parsedInput);
      }

      return completeContactAssignmentCallUseCase(
        {
          actorUserId: ctx.actor.userId,
          assignmentId: parsedInput.value.assignmentId,
          contactId: parsedInput.value.contactId,
          outcome: parsedInput.value.outcome,
          notes: notes?.trim() ? notes : null,
        },
        getServerRuntime().contactAssignments.interactionUow,
      );
    },
  });
}
