import { getLeadCapacitySnapshot } from "~/server/capacity/application/queries/get-lead-capacity-snapshot";
import type { UsageReservationPorts } from "~/server/capacity/application/usage/ledger";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import { createContactAssignmentsRepo } from "~/server/contact-assignments/infrastructure/assignment-repo";
import { createContactCadenceRepo } from "~/server/contact-assignments/infrastructure/cadence-repo";
import { createOrganizationRepo } from "~/server/organization/organization-repo";
import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { EngineClient } from "~/server/shared/engine/client";
import { createInteractionLogsRepo } from "~/server/shared/repos-interaction-logs";
import { isErr, Ok } from "~/server/shared/result";

export type ContactAssignmentRepos = {
  users: ReturnType<typeof createCapacityUsersRepo>;
  leadPolicyDefaults: ReturnType<typeof createLeadPolicyDefaultsRepo>;
  leadPolicyOverrides: ReturnType<typeof createLeadPolicyOverridesRepo>;
  leadCapacityGrants: ReturnType<typeof createLeadCapacityGrantsRepo>;
  leadUsageReservations: ReturnType<typeof createLeadUsageReservationsRepo>;
  leadUsageCommits: ReturnType<typeof createLeadUsageCommitsRepo>;
  contactAssignments: ReturnType<typeof createContactAssignmentsRepo>;
  organization: ReturnType<typeof createOrganizationRepo>;
  cadence: ReturnType<typeof createContactCadenceRepo>;
};

interface ContactAssignmentsContextDeps {
  executor: DatabaseExecutor;
  engine: Pick<EngineClient, "requestCandidates">;
}

function buildRepos(executor: DatabaseExecutor): ContactAssignmentRepos {
  return {
    users: createCapacityUsersRepo(executor),
    leadPolicyDefaults: createLeadPolicyDefaultsRepo(executor),
    leadPolicyOverrides: createLeadPolicyOverridesRepo(executor),
    leadCapacityGrants: createLeadCapacityGrantsRepo(executor),
    leadUsageReservations: createLeadUsageReservationsRepo(executor),
    leadUsageCommits: createLeadUsageCommitsRepo(executor),
    contactAssignments: createContactAssignmentsRepo(executor),
    organization: createOrganizationRepo(executor),
    cadence: createContactCadenceRepo(executor),
  };
}

function buildLeadUsageReservationPorts(
  executor: DatabaseExecutor,
): UsageReservationPorts<"lead"> {
  return {
    executor,
    async checkRemaining(trx, actorUserId) {
      const snapshot = await getLeadCapacitySnapshot(
        actorUserId,
        buildRepos(trx),
      );
      if (isErr(snapshot)) return snapshot;
      return Ok(snapshot.value.remaining);
    },
    reservations: createLeadUsageReservationsRepo,
    commits: createLeadUsageCommitsRepo,
  };
}

export function createContactAssignmentsContext(
  deps: ContactAssignmentsContextDeps,
) {
  const { executor, engine } = deps;

  return {
    repos: buildRepos(executor),
    engine,
    interactionUow: createExecutorUow(executor, (txDb) => ({
      contactAssignments: createContactAssignmentsRepo(txDb),
      interactionLogs: createInteractionLogsRepo(txDb),
    })),
    uow: createExecutorUow(executor, buildRepos),
    leadUsageReservationPorts: buildLeadUsageReservationPorts(executor),
  };
}

export type ContactAssignmentsContext = ReturnType<
  typeof createContactAssignmentsContext
>;
