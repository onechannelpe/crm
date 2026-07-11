import type { ContactAssignmentsRepo } from "~/server/contact-assignments/infrastructure/assignment-repo";
import type { AppUow } from "~/server/shared/application/uow";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { InteractionLogsRepo } from "~/server/shared/repos-interaction-logs";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  CompleteContactAssignmentCallCommand,
  CompleteContactAssignmentCallResult,
} from "./contracts";

type CompleteContactAssignmentCallTxRepos = {
  contactAssignments: Pick<
    ContactAssignmentsRepo,
    "findActiveByIdForUser" | "markCompleted"
  >;
  interactionLogs: Pick<InteractionLogsRepo, "create">;
};

async function completeAssignmentInteraction(
  input: CompleteContactAssignmentCallCommand,
  repos: CompleteContactAssignmentCallTxRepos,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  const assignment = await repos.contactAssignments.findActiveByIdForUser(
    input.assignmentId,
    input.actorUserId,
  );
  if (!assignment || assignment.contact_id !== input.contactId) {
    return Err(fail("assignment_inactive"));
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
    created_at: new Date(),
  });

  return Ok({ success: true });
}

export function completeContactAssignmentCall(
  input: CompleteContactAssignmentCallCommand,
  uow: AppUow<CompleteContactAssignmentCallTxRepos>,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  return uow.run((repos) => completeAssignmentInteraction(input, repos));
}
