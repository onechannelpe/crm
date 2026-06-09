"use server";

import { CONTACT_ASSIGNMENT_CALL_OUTCOMES } from "~/contracts/contact-assignments/vocabulary";
import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import type { CompleteContactAssignmentCallResult } from "~/server/contact-assignments/application/contracts";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";

export async function completeContactAssignmentCall(
  input: unknown,
): Promise<CompleteContactAssignmentCallResult> {
  return runAction({
    name: "contact_assignments.complete_call",
    access: { kind: "permission", permission: "lead:work" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        assignmentId: r.num("assignmentId"),
        contactId: r.num("contactId"),
        outcome: r.enum("outcome", CONTACT_ASSIGNMENT_CALL_OUTCOMES),
        notes: r.optStr("notes") ?? null,
      })),

    audit: ({ assignmentId, contactId }) => ({
      assignmentId,
      contactId,
    }),

    execute: ({ actor }, command) =>
      completeContactAssignmentCallUseCase(
        {
          actorUserId: actor.userId,
          assignmentId: command.assignmentId,
          contactId: command.contactId,
          outcome: command.outcome,
          notes: command.notes,
        },
        getServerRuntime().contactAssignments.interactionUow,
      ),
  });
}
