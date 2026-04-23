import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createInteractionLogsRepo } from "~/server/shared/repos-interaction-logs";

function createContactAssignmentInteractionRepos(executor: DatabaseExecutor) {
  return {
    contactAssignments: createContactAssignmentsRepo(executor),
    interactionLogs: createInteractionLogsRepo(executor),
  };
}

export type ContactAssignmentInteractionRepos = ReturnType<
  typeof createContactAssignmentInteractionRepos
>;

export type ContactAssignmentInteractionRunner = <T>(
  operation: (repos: ContactAssignmentInteractionRepos) => Promise<T>,
) => Promise<T>;

export function createContactAssignmentInteractionRunner(
  executor: DatabaseExecutor,
): ContactAssignmentInteractionRunner {
  return function runContactAssignmentInteraction<T>(
    operation: (repos: ContactAssignmentInteractionRepos) => Promise<T>,
  ) {
    return executor
      .transaction()
      .execute((transactionDb) =>
        operation(createContactAssignmentInteractionRepos(transactionDb)),
      );
  };
}
