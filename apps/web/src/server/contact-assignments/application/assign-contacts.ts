import { executeWithUsageReservation } from "~/server/capacity/application/usage/ledger";
import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import { type DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import { isErr, Ok, type Result } from "~/server/shared/result";

import {
  planContactAssignments,
  type AssignmentPlanRepos,
} from "./assignment-plan";
import {
  createContactAssignmentsFromCandidates,
  type AssignContactsUow,
} from "./contact-assignment-writer";
import type { AssignContactsCommand, AssignContactsResult } from "./contracts";

type AssignContactsRepos = AssignmentPlanRepos & {
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
};

interface AssignContactsDeps {
  repos: AssignContactsRepos;
  uow: AssignContactsUow;
  engine: Pick<EngineClient, "requestCandidates">;
}

async function requestAssignableCandidates(input: {
  command: AssignContactsCommand;
  requested: number;
  engine: Pick<EngineClient, "requestCandidates">;
}) {
  const candidatesResult = await input.engine.requestCandidates({
    branchId: input.command.branchId,
    userId: input.command.actorUserId,
    amount: input.requested,
  });
  return candidatesResult;
}

export async function assignContacts(
  command: AssignContactsCommand,
  deps: AssignContactsDeps,
): Promise<Result<AssignContactsResult, DomainError>> {
  const { repos, uow, engine } = deps;

  const plan = await planContactAssignments(command.actorUserId, repos);
  if (isErr(plan)) return plan;

  if (plan.value.requested === 0) return Ok({ requested: 0, assigned: 0 });

  const assignedResult = await executeWithUsageReservation(
    {
      kind: "lead",
      actorUserId: command.actorUserId,
      requested: plan.value.requested,
      remainingCapacity: plan.value.remainingCapacity,
      reserveReason: "lead_refill",
      failureReason: "workflow_cancelled",
    },
    {
      reservations: repos.leadUsageReservations,
      commits: repos.leadUsageCommits,
    },
    async () => {
      const candidatesResult = await requestAssignableCandidates({
        command,
        requested: plan.value.requested,
        engine,
      });
      if (isErr(candidatesResult)) {
        return candidatesResult;
      }

      const assigned = await createContactAssignmentsFromCandidates({
        actorUserId: command.actorUserId,
        candidates: candidatesResult.value,
        uow,
      });
      if (isErr(assigned)) {
        return assigned;
      }

      return Ok({ value: assigned.value, consumed: assigned.value });
    },
  );
  if (isErr(assignedResult)) {
    return assignedResult;
  }

  return Ok({
    requested: plan.value.requested,
    assigned: assignedResult.value,
  });
}
