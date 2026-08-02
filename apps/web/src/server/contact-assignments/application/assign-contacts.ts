import { type DomainError } from "~/domain/errors";
import { LeadReservationId } from "~/domain/ids";
import {
  executeWithUsageReservation,
  type UsageReservationPorts,
} from "~/server/capacity/application/usage/ledger";
import type { EngineClient } from "~/server/integrations/engine/client";
import type { OperationContext } from "~/server/platform/operation/context";
import { isErr, Ok, type Result } from "~/shared/result";

import {
  planContactAssignments,
  type AssignmentPlanRepos,
} from "./assignment-plan";
import {
  createContactAssignmentsFromCandidates,
  type AssignContactsUow,
} from "./contact-assignment-writer";
import type { AssignContactsCommand, AssignContactsResult } from "./contracts";

interface AssignContactsDeps {
  repos: AssignmentPlanRepos;
  uow: AssignContactsUow;
  engine: Pick<EngineClient, "requestCandidates">;
  leadUsageReservationPorts: UsageReservationPorts<"lead">;
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
  operation: OperationContext,
): Promise<Result<AssignContactsResult, DomainError>> {
  const { repos, uow, engine, leadUsageReservationPorts } = deps;

  const plan = await planContactAssignments(
    command.actorUserId,
    repos,
    operation,
  );
  if (isErr(plan)) return plan;

  if (plan.value.requested === 0) return Ok({ requested: 0, assigned: 0 });

  const assignedResult = await executeWithUsageReservation(
    {
      kind: "lead",
      actorUserId: command.actorUserId,
      requested: plan.value.requested,
      reserveReason: "lead_refill",
      brand: LeadReservationId.trust,
    },
    leadUsageReservationPorts,
    operation,
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
        operation,
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
