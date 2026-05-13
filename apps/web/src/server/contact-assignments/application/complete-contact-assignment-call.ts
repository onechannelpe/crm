import { hasPermission } from "~/lib/auth/access/rbac";
import type { AppUow } from "~/server/shared/application/uow";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  CompleteContactAssignmentCallCommand,
  CompleteContactAssignmentCallResult,
} from "./contracts";
import type { CompleteContactAssignmentCallTxPort } from "./ports/complete-contact-assignment-call-tx-port";

async function completeAssignmentInteraction(
  input: CompleteContactAssignmentCallCommand,
  repos: CompleteContactAssignmentCallTxPort,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  const assignment = await repos.contactAssignments.findActiveByIdForUser(
    input.assignmentId,
    input.actorUserId,
  );
  if (!assignment || assignment.contact_id !== input.contactId) {
    return Err(
      domainError(
        "forbidden",
        "assignment_inactive",
        "Contact assignment is not active or does not match the contact",
      ),
    );
  }

  await repos.contactAssignments.markCompleted(
    input.assignmentId,
    input.actorUserId,
  );
  await repos.interactionLogs.create({
    contact_id: input.contactId,
    user_id: input.actorUserId,
    outcome: input.outcome,
    notes: input.notes,
    duration_seconds: null,
    created_at: Date.now(),
  });

  return Ok({ success: true });
}

export function completeContactAssignmentCall(
  input: CompleteContactAssignmentCallCommand,
  uow: AppUow<CompleteContactAssignmentCallTxPort>,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:work")) {
    return Promise.resolve(
      Err(domainError("forbidden", "forbidden", "Access denied")),
    );
  }

  return uow.run((repos) => completeAssignmentInteraction(input, repos));
}
