import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { EngineClient } from "~/server/shared/engine/client";

function createContactAssignmentRepos(executor: DatabaseExecutor) {
  return {
    users: createCapacityUsersRepo(executor),
    leadPolicyDefaults: createLeadPolicyDefaultsRepo(executor),
    leadPolicyOverrides: createLeadPolicyOverridesRepo(executor),
    leadCapacityGrants: createLeadCapacityGrantsRepo(executor),
    leadUsageReservations: createLeadUsageReservationsRepo(executor),
    leadUsageCommits: createLeadUsageCommitsRepo(executor),
    contactAssignments: createContactAssignmentsRepo(executor),
    organizations: createOrganizationsRepo(executor),
    contacts: createContactsRepo(executor),
  };
}

interface ContactAssignmentContextDeps {
  executor: DatabaseExecutor;
  engine: Pick<EngineClient, "requestCandidates">;
}

export function createContactAssignmentContext(
  deps: ContactAssignmentContextDeps,
) {
  const { executor, engine } = deps;

  return {
    repos: createContactAssignmentRepos(executor),
    engine,
    runInTransaction: <T>(
      operation: (
        repos: ReturnType<typeof createContactAssignmentRepos>,
      ) => Promise<T>,
    ) => {
      return executor
        .transaction()
        .execute((transactionDb) =>
          operation(createContactAssignmentRepos(transactionDb)),
        );
    },
  };
}

export type ContactAssignmentContext = ReturnType<
  typeof createContactAssignmentContext
>;
