import { CONTACT_ASSIGNMENT_CALL_OUTCOMES } from "~/contracts/contact-assignments/vocabulary";
import { ContactAssignmentId, OrganizationPersonId } from "~/domain/ids";
import { completeContactAssignmentCall as completeContactAssignmentCallUseCase } from "~/server/contact-assignments/application/complete-contact-assignment-call";
import type { CompleteContactAssignmentCallResult } from "~/server/contact-assignments/application/contracts";
import { composeContactAssignments } from "~/server/contact-assignments/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function completeContactAssignmentCall(
  input: unknown,
): Promise<CompleteContactAssignmentCallResult> {
  "use server";

  return executeSessionServerFunction({
    name: "contact_assignments.complete_call",
    access: { kind: "permission", permission: "lead:work" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        assignmentId: r.id("assignmentId", ContactAssignmentId),
        contactId: r.id("contactId", OrganizationPersonId),
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
        composeContactAssignments().interactionUow,
      ),
  });
}
