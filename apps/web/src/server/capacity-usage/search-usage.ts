import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import {
  asSearchReservationId,
  type SearchReservationId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "./repos";

export interface ReserveSearchUsageCommand {
  actorUserId: UserId;
  amount: number;
  remainingCapacity: number;
  reason: "direct_search" | "admin_grant_adjustment";
}

export interface CommitSearchUsageCommand {
  reservationId: SearchReservationId;
  amount: number;
}

export interface CancelSearchUsageCommand {
  reservationId: SearchReservationId;
  reason: "external_failure" | "partial_use" | "workflow_cancelled";
}

export interface GrantSearchCapacityCommand {
  actorUserId: UserId;
  targetUserId: UserId;
  amount: number;
  reason: string;
}

interface UsageRepos {
  searchCapacityGrants: SearchCapacityGrantsRepo;
  searchUsageReservations: SearchUsageReservationsRepo;
  searchUsageCommits: SearchUsageCommitsRepo;
}

export async function reserveSearchUsage(
  command: ReserveSearchUsageCommand,
  repos: Pick<UsageRepos, "searchUsageReservations">,
): Promise<Result<SearchReservationId, DomainError>> {
  if (command.remainingCapacity < command.amount) {
    return Err(
      domainError("conflict", "search_exhausted", "Search capacity exhausted"),
    );
  }
  try {
    const row = await repos.searchUsageReservations.insert({
      user_id: command.actorUserId,
      amount: command.amount,
      reason: command.reason,
    });
    return Ok(asSearchReservationId(row.id));
  } catch (error) {
    throw error;
  }
}

export async function commitSearchUsage(
  command: CommitSearchUsageCommand,
  repos: Pick<UsageRepos, "searchUsageReservations" | "searchUsageCommits">,
): Promise<Result<void, DomainError>> {
  try {
    const reservation = await repos.searchUsageReservations.findById(
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
    await repos.searchUsageCommits.insert({
      reservation_id: command.reservationId.value,
      amount: command.amount,
    });
    await repos.searchUsageReservations.updateStatus(
      command.reservationId.value,
      "committed",
    );
    return Ok(undefined);
  } catch (error) {
    throw error;
  }
}

export async function cancelSearchUsage(
  command: CancelSearchUsageCommand,
  repos: Pick<UsageRepos, "searchUsageReservations">,
): Promise<Result<void, DomainError>> {
  try {
    const reservation = await repos.searchUsageReservations.findById(
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
    await repos.searchUsageReservations.updateStatus(
      command.reservationId.value,
      "cancelled",
    );
    return Ok(undefined);
  } catch (error) {
    throw error;
  }
}

export async function grantSearchCapacity(
  command: GrantSearchCapacityCommand,
  repos: Pick<UsageRepos, "searchCapacityGrants">,
): Promise<Result<void, DomainError>> {
  try {
    await repos.searchCapacityGrants.insert({
      user_id: command.targetUserId,
      amount: command.amount,
      reason: command.reason,
      actor_user_id: command.actorUserId,
    });
    return Ok(undefined);
  } catch (error) {
    throw error;
  }
}
