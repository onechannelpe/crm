"use server";

import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import {
  CONTACT_ASSIGNMENT_CALL_OUTCOMES,
  type CompleteContactAssignmentCallResult,
  type ContactAssignmentCallOutcome,
} from "~/server/contact-assignments/application/contracts";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

export type CompleteContactAssignmentCallInput = {
  assignmentId: number;
  contactId: number;
  outcome: ContactAssignmentCallOutcome;
  notes: string | null;
};

function parseCompleteCall(
  input: unknown,
): Result<CompleteContactAssignmentCallInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    assignmentId: r.num("assignmentId"),
    contactId: r.num("contactId"),
    outcome: r.enum("outcome", CONTACT_ASSIGNMENT_CALL_OUTCOMES),
    notes: r.optStr("notes") ?? null,
  }));
}

export async function completeContactAssignmentCall(
  input: unknown,
): Promise<CompleteContactAssignmentCallResult> {
  return runAction({
    actionName: "contact_assignments.complete_call",
    access: { kind: "permission", permission: "lead:work" },
    parse: () => parseCompleteCall(input),
    audit: ({ assignmentId, contactId }) => ({ assignmentId, contactId }),
    execute: (ctx, call) =>
      completeContactAssignmentCallUseCase(
        {
          actorUserId: ctx.actor.userId,
          assignmentId: call.assignmentId,
          contactId: call.contactId,
          outcome: call.outcome,
          notes: call.notes,
        },
        getServerRuntime().contactAssignments.interactionUow,
      ),
  });
}
