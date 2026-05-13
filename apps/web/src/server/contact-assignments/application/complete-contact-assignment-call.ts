import { hasPermission } from "~/lib/auth/access/rbac";
import type { AppUow } from "~/server/shared/application/uow";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  ContactAssignmentCallOutcome,
  CompleteContactAssignmentCallCommand,
  CompleteContactAssignmentCallResult,
} from "./contracts";

type CompleteContactAssignmentCallTxRepos = {
  contactAssignments: {
    findActiveByIdForUser(
      assignmentId: number,
      userId: number,
    ): Promise<{ contact_id: number } | undefined>;
    markCompleted(assignmentId: number, userId: number): Promise<unknown>;
  };
  interactionLogs: {
    create(input: {
      contact_id: number;
      user_id: number;
      outcome: ContactAssignmentCallOutcome;
      notes: string | null;
      duration_seconds: number | null;
      created_at: number;
    }): Promise<unknown>;
  };
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
  uow: AppUow<CompleteContactAssignmentCallTxRepos>,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:work")) {
    return Promise.resolve(
      Err(domainError("forbidden", "forbidden", "Access denied")),
    );
  }

  return uow.run((repos) => completeAssignmentInteraction(input, repos));
}
