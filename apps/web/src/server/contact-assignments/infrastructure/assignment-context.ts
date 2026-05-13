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
import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { EngineClient } from "~/server/shared/engine/client";

export type ContactAssignmentRepos = {
  users: ReturnType<typeof createCapacityUsersRepo>;
  leadPolicyDefaults: ReturnType<typeof createLeadPolicyDefaultsRepo>;
  leadPolicyOverrides: ReturnType<typeof createLeadPolicyOverridesRepo>;
  leadCapacityGrants: ReturnType<typeof createLeadCapacityGrantsRepo>;
  leadUsageReservations: ReturnType<typeof createLeadUsageReservationsRepo>;
  leadUsageCommits: ReturnType<typeof createLeadUsageCommitsRepo>;
  contactAssignments: ReturnType<typeof createContactAssignmentsRepo>;
  organizations: ReturnType<typeof createOrganizationsRepo>;
  contacts: ReturnType<typeof createContactsRepo>;
};

interface ContactAssignmentContextDeps {
  executor: DatabaseExecutor;
  engine: Pick<EngineClient, "requestCandidates">;
}

export function createContactAssignmentContext(
  deps: ContactAssignmentContextDeps,
) {
  const { executor, engine } = deps;
  const repos: ContactAssignmentRepos = {
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

  return {
    repos,
    engine,
    uow: createExecutorUow(
      executor,
      (txDb): ContactAssignmentRepos => ({
        users: createCapacityUsersRepo(txDb),
        leadPolicyDefaults: createLeadPolicyDefaultsRepo(txDb),
        leadPolicyOverrides: createLeadPolicyOverridesRepo(txDb),
        leadCapacityGrants: createLeadCapacityGrantsRepo(txDb),
        leadUsageReservations: createLeadUsageReservationsRepo(txDb),
        leadUsageCommits: createLeadUsageCommitsRepo(txDb),
        contactAssignments: createContactAssignmentsRepo(txDb),
        organizations: createOrganizationsRepo(txDb),
        contacts: createContactsRepo(txDb),
      }),
    ),
  };
}

export type ContactAssignmentContext = ReturnType<
  typeof createContactAssignmentContext
>;
