import { type DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import type { BranchId, UserId } from "~/server/shared/ids";
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
  type ContactAssignmentRefillTransactionRunner,
  type ContactAssignmentRefillTxRepos,
} from "./refill-writer";

export interface RequestContactAssignmentRefillCommand {
  actorUserId: UserId;
  branchId: BranchId;
}

export interface ContactAssignmentRefillResult {
  requested: number;
  assigned: number;
}

type RefillRepos = AssignmentPlanRepos &
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

export type RefillTxRepos = ContactAssignmentRefillTxRepos;
export type RefillTransactionRunner = ContactAssignmentRefillTransactionRunner;

interface RefillDeps {
  repos: RefillRepos;
  runInTransaction: RefillTransactionRunner;
  engine: Pick<EngineClient, "requestCandidates">;
}

export async function assignContacts(
  command: RequestContactAssignmentRefillCommand,
  deps: RefillDeps,
): Promise<Result<ContactAssignmentRefillResult, DomainError>> {
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

  const candidatesResult = await engine.requestCandidates({
    branchId: command.branchId,
    userId: command.actorUserId,
    amount: plan.value.requested,
  });
  if (isErr(candidatesResult)) {
    await cancelAssignmentReservation(reservationId, "external_failure", repos);
    return candidatesResult;
  }

  const assigned = await createContactAssignmentsFromCandidates({
    actorUserId: command.actorUserId,
    candidates: candidatesResult.value,
    runInTransaction,
  });

  if (assigned === 0) {
    await cancelAssignmentReservation(reservationId, "partial_use", repos);
  } else {
    await commitAssignmentReservation({ reservationId, assigned }, repos);
  }

  return Ok({ requested: plan.value.requested, assigned });
}
