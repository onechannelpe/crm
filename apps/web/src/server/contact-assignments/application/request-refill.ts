import {
  cancelLeadUsage,
  commitLeadUsage,
  reserveLeadUsage,
} from "~/server/capacity-usage/lead-usage";
import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/get-lead-capacity-snapshot";
import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { type DomainError } from "~/server/shared/domain-error";
import type { EngineClient } from "~/server/shared/engine/client";
import type { BranchId, UserId } from "~/server/shared/ids";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { computeNeededAssignments } from "../domain/refill";
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

interface RefillRepos {
  users: {
    findById(
      id: UserId,
    ): Promise<{ team_id: number | null; branch_id: number } | undefined>;
  };
  leadPolicyDefaults: LeadPolicyDefaultsRepo;
  leadPolicyOverrides: LeadPolicyOverridesRepo;
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
  contactAssignments: { countActiveByUser(userId: number): Promise<number> };
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
}

export type RefillTxRepos = ContactAssignmentRefillTxRepos;
export type RefillTransactionRunner = ContactAssignmentRefillTransactionRunner;

interface RefillDeps {
  repos: RefillRepos;
  runInTransaction: RefillTransactionRunner;
  engine: Pick<EngineClient, "requestCandidates">;
}

export async function requestContactAssignmentRefill(
  command: RequestContactAssignmentRefillCommand,
  deps: RefillDeps,
): Promise<Result<ContactAssignmentRefillResult, DomainError>> {
  const { repos, runInTransaction, engine } = deps;

  const snapshotResult = await getLeadCapacitySnapshot(
    command.actorUserId,
    repos,
  );
  if (isErr(snapshotResult)) return snapshotResult;

  const activeAssignments = snapshotResult.value.activeAssignments;
  const needed = computeNeededAssignments(
    activeAssignments,
    snapshotResult.value.policy.bufferTarget,
  );

  if (needed === 0) return Ok({ requested: 0, assigned: 0 });

  const reservationResult = await reserveLeadUsage(
    {
      actorUserId: command.actorUserId,
      amount: needed,
      remainingCapacity: snapshotResult.value.remaining,
      reason: "lead_refill",
    },
    repos,
  );
  if (isErr(reservationResult)) return reservationResult;

  const reservationId = reservationResult.value;

  const candidatesResult = await engine.requestCandidates({
    branchId: command.branchId,
    userId: command.actorUserId,
    amount: needed,
  });
  if (isErr(candidatesResult)) {
    await cancelLeadUsage({ reservationId, reason: "external_failure" }, repos);
    return candidatesResult;
  }

  const assigned = await createContactAssignmentsFromCandidates({
    actorUserId: command.actorUserId,
    candidates: candidatesResult.value,
    runInTransaction,
  });

  if (assigned === 0) {
    await cancelLeadUsage({ reservationId, reason: "partial_use" }, repos);
  } else {
    await commitLeadUsage({ reservationId, amount: assigned }, repos);
  }

  return Ok({ requested: needed, assigned });
}
