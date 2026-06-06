import { domainError, type DomainError } from "~/server/shared/domain-error";
import {
  asLeadReservationId,
  type LeadReservationId,
  type UserId,
} from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "./repos";

interface ReserveLeadUsageCommand {
  actorUserId: UserId;
  amount: number;
  remainingCapacity: number;
  reason: "lead_refill" | "admin_grant_adjustment";
}

interface CommitLeadUsageCommand {
  reservationId: LeadReservationId;
  amount: number;
}

interface CancelLeadUsageCommand {
  reservationId: LeadReservationId;
  reason: "external_failure" | "partial_use" | "workflow_cancelled";
}

interface GrantLeadCapacityCommand {
  actorUserId: UserId;
  targetUserId: UserId;
  amount: number;
  reason: string;
}

interface UsageRepos {
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
}

interface ExecuteWithLeadUsageReservationCommand {
  actorUserId: UserId;
  requested: number;
  remainingCapacity: number;
  reserveReason: ReserveLeadUsageCommand["reason"];
  failureReason: CancelLeadUsageCommand["reason"];
}

async function reserveLeadUsage(
  command: ReserveLeadUsageCommand,
  repos: Pick<UsageRepos, "leadUsageReservations">,
): Promise<Result<LeadReservationId, DomainError>> {
  if (command.remainingCapacity < command.amount) {
    return Err(
      domainError("conflict", "lead_exhausted", "Lead capacity exhausted"),
    );
  }
  const row = await repos.leadUsageReservations.insert({
    user_id: command.actorUserId,
    amount: command.amount,
    reason: command.reason,
  });
  return Ok(asLeadReservationId(row.id));
}

async function commitLeadUsage(
  command: CommitLeadUsageCommand,
  repos: Pick<UsageRepos, "leadUsageReservations" | "leadUsageCommits">,
): Promise<Result<void, DomainError>> {
  const reservation = await repos.leadUsageReservations.findById(
    command.reservationId.value,
  );
  if (!reservation) {
    return Err(
      domainError(
        "not_found",
        "reservation_not_found",
        "Reservation not found",
      ),
    );
  }
  await repos.leadUsageCommits.insert({
    reservation_id: command.reservationId.value,
    amount: command.amount,
  });
  await repos.leadUsageReservations.updateAmountAndStatus(
    command.reservationId.value,
    command.amount,
    "committed",
  );
  return Ok(undefined);
}

async function cancelLeadUsage(
  command: CancelLeadUsageCommand,
  repos: Pick<UsageRepos, "leadUsageReservations">,
): Promise<Result<void, DomainError>> {
  const reservation = await repos.leadUsageReservations.findById(
    command.reservationId.value,
  );
  if (!reservation) {
    return Err(
      domainError(
        "not_found",
        "reservation_not_found",
        "Reservation not found",
      ),
    );
  }
  await repos.leadUsageReservations.updateStatus(
    command.reservationId.value,
    "cancelled",
  );
  return Ok(undefined);
}

export async function grantLeadCapacity(
  command: GrantLeadCapacityCommand,
  repos: Pick<UsageRepos, "leadCapacityGrants">,
): Promise<Result<void, DomainError>> {
  await repos.leadCapacityGrants.insert({
    user_id: command.targetUserId,
    amount: command.amount,
    reason: command.reason,
    actor_user_id: command.actorUserId,
  });
  return Ok(undefined);
}

export async function executeWithLeadUsageReservation<T>(
  command: ExecuteWithLeadUsageReservationCommand,
  repos: Pick<UsageRepos, "leadUsageReservations" | "leadUsageCommits">,
  run: (
    reservationId: LeadReservationId,
  ) => Promise<Result<{ value: T; consumed: number }, DomainError>>,
): Promise<Result<T, DomainError>> {
  const reservationResult = await reserveLeadUsage(
    {
      actorUserId: command.actorUserId,
      amount: command.requested,
      remainingCapacity: command.remainingCapacity,
      reason: command.reserveReason,
    },
    repos,
  );
  if (isErr(reservationResult)) {
    return reservationResult;
  }

  const reservationId = reservationResult.value;

  let runResult: Result<{ value: T; consumed: number }, DomainError>;
  try {
    runResult = await run(reservationId);
  } catch (error) {
    await cancelLeadUsage(
      { reservationId, reason: command.failureReason },
      repos,
    );
    throw error;
  }

  if (isErr(runResult)) {
    await cancelLeadUsage(
      { reservationId, reason: command.failureReason },
      repos,
    );
    return runResult;
  }

  const consumed = runResult.value.consumed;
  if (consumed === 0) {
    await cancelLeadUsage({ reservationId, reason: "partial_use" }, repos);
    return Ok(runResult.value.value);
  }

  const commitResult = await commitLeadUsage(
    { reservationId, amount: consumed },
    repos,
  );
  if (isErr(commitResult)) {
    return commitResult;
  }

  return Ok(runResult.value.value);
}
