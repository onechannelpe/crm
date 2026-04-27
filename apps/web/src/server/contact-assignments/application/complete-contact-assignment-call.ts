import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  ContactAssignmentInteractionRepos,
  ContactAssignmentInteractionRunner,
} from "../infrastructure/interaction-context";
import type {
  CompleteContactAssignmentCallCommand,
  CompleteContactAssignmentCallResult,
} from "./contracts";

function rejectMismatchedAssignment(): never {
  throw new Error(
    "Contact assignment is not active or does not match the contact",
  );
}

async function completeAssignmentInteraction(
  input: CompleteContactAssignmentCallCommand,
  repos: ContactAssignmentInteractionRepos,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  const assignment = await repos.contactAssignments.findActiveByIdForUser(
    input.assignmentId,
    input.actorUserId,
  );
  if (!assignment || assignment.contact_id !== input.contactId) {
    return rejectMismatchedAssignment();
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
  runInTransaction: ContactAssignmentInteractionRunner,
): Promise<Result<CompleteContactAssignmentCallResult, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:work")) {
    return Promise.resolve(
      Err(domainError("forbidden", "forbidden", "Access denied")),
    );
  }

  return runInTransaction((repos) =>
    completeAssignmentInteraction(input, repos),
  );
}
