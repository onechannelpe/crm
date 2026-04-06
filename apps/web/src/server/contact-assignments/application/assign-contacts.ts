import { type DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import type { BranchId, LeadReservationId, UserId } from "~/server/shared/ids";
import { isErr, Ok, type Result } from "~/server/shared/result";

import {
  cancelAssignmentReservation,
  commitAssignmentReservation,
  reserveAssignmentCapacity,
  type AssignmentCapacityRepos,
} from "./assignment-capacity";
import {
  planContactAssignments,
  type AssignmentPlanRepos,
} from "./assignment-plan";
import {
  createContactAssignmentsFromCandidates,
  type AssignContactsTransactionRepos,
  type AssignContactsTransactionRunner,
} from "./contact-assignment-writer";

export interface AssignContactsCommand {
  actorUserId: UserId;
  branchId: BranchId;
}

export interface AssignContactsResult {
  requested: number;
  assigned: number;
}

type AssignContactsRepos = AssignmentPlanRepos &
  AssignmentCapacityRepos & {
    organizations: {
      findOrCreate(ruc: string, name: string): Promise<{ id: number }>;
    };
    contacts: {
      findOrCreate(
        organizationId: number,
        dni: string,
        name: string,
        phone: string,
      ): Promise<{ id: number; cooldown_until: number | null }>;
    };
  };

interface AssignContactsDeps {
  repos: AssignContactsRepos;
  runInTransaction: AssignContactsTransactionRunner;
  engine: Pick<EngineClient, "requestCandidates">;
}

async function requestAssignableCandidates(input: {
  command: AssignContactsCommand;
  requested: number;
  engine: Pick<EngineClient, "requestCandidates">;
  reservationId: LeadReservationId;
  repos: AssignmentCapacityRepos;
}) {
  const candidatesResult = await input.engine.requestCandidates({
    branchId: input.command.branchId,
    userId: input.command.actorUserId,
    amount: input.requested,
  });
  if (isErr(candidatesResult)) {
    await cancelAssignmentReservation(
      input.reservationId,
      "external_failure",
      input.repos,
    );
  }
  return candidatesResult;
}

async function finalizeAssignmentReservation(input: {
  reservationId: LeadReservationId;
  assigned: number;
  repos: AssignmentCapacityRepos;
}) {
  if (input.assigned === 0) {
    await cancelAssignmentReservation(
      input.reservationId,
      "partial_use",
      input.repos,
    );
    return;
  }

  await commitAssignmentReservation(
    {
      reservationId: input.reservationId,
      assigned: input.assigned,
    },
    input.repos,
  );
}

export async function assignContacts(
  command: AssignContactsCommand,
  deps: AssignContactsDeps,
): Promise<Result<AssignContactsResult, DomainError>> {
  const { repos, runInTransaction, engine } = deps;

  const plan = await planContactAssignments(command.actorUserId, repos);
  if (isErr(plan)) return plan;

  if (plan.value.requested === 0) return Ok({ requested: 0, assigned: 0 });

  const reservationResult = await reserveAssignmentCapacity(
    {
      actorUserId: command.actorUserId,
      requested: plan.value.requested,
      remainingCapacity: plan.value.remainingCapacity,
    },
    repos,
  );
  if (isErr(reservationResult)) return reservationResult;

  const reservationId = reservationResult.value;

  const candidatesResult = await requestAssignableCandidates({
    command,
    requested: plan.value.requested,
    engine,
    reservationId,
    repos,
  });
  if (isErr(candidatesResult)) {
    return candidatesResult;
  }

  const assigned = await createContactAssignmentsFromCandidates({
    actorUserId: command.actorUserId,
    candidates: candidatesResult.value,
    runInTransaction,
  });

  await finalizeAssignmentReservation({ reservationId, assigned, repos });

  return Ok({ requested: plan.value.requested, assigned });
}
