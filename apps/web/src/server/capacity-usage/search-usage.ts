import { getEffectiveSearchPolicy } from "~/server/capacity-policy/search-policy";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { asSearchReservationId, type SearchReservationId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import { buildSearchCapacitySnapshot, type SearchCapacitySnapshot } from "./snapshot";
import type {
  SearchCapacityGrantsRepo,
  SearchUsageCommitsRepo,
  SearchUsageReservationsRepo,
} from "./repos";
import { currentMonthlyPeriod } from "~/server/shared/time";

export type { SearchCapacitySnapshot };

export interface ReserveSearchUsageCommand {
  actorUserId: UserId;
  amount: number;
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
  users: { findById(id: UserId): Promise<{ team_id: number | null; branch_id: number } | undefined> };
  searchPolicyDefaults: Parameters<typeof getEffectiveSearchPolicy>[1]["searchPolicyDefaults"];
  searchPolicyOverrides: Parameters<typeof getEffectiveSearchPolicy>[1]["searchPolicyOverrides"];
  searchCapacityGrants: SearchCapacityGrantsRepo;
  searchUsageReservations: SearchUsageReservationsRepo;
  searchUsageCommits: SearchUsageCommitsRepo;
}

export async function reserveSearchUsage(
  command: ReserveSearchUsageCommand,
  repos: UsageRepos,
): Promise<Result<SearchReservationId, DomainError>> {
  try {
    const snapshotResult = await getSearchCapacitySnapshot(command.actorUserId, repos);
    if (!snapshotResult.ok) return snapshotResult;

    if (snapshotResult.value.remaining < command.amount) {
      return Err(domainError("conflict", "search_exhausted", "Search capacity exhausted"));
    }

    const row = await repos.searchUsageReservations.insert({
      user_id: command.actorUserId,
      amount: command.amount,
      reason: command.reason,
    });
    return Ok(asSearchReservationId(row.id));
  } catch (error) {
    return Err(domainError("unexpected", "unexpected", error instanceof Error ? error.message : "Failed to reserve search usage"));
  }
}

export async function commitSearchUsage(
  command: CommitSearchUsageCommand,
  repos: Pick<UsageRepos, "searchUsageReservations" | "searchUsageCommits">,
): Promise<Result<void, DomainError>> {
  try {
    const reservation = await repos.searchUsageReservations.findById(command.reservationId);
    if (!reservation) {
      return Err(domainError("not_found", "reservation_not_found", "Reservation not found"));
    }
    await repos.searchUsageCommits.insert({ reservation_id: command.reservationId, amount: command.amount });
    await repos.searchUsageReservations.updateStatus(command.reservationId, "committed");
    return Ok(undefined);
  } catch (error) {
    return Err(domainError("unexpected", "unexpected", error instanceof Error ? error.message : "Failed to commit search usage"));
  }
}

export async function cancelSearchUsage(
  command: CancelSearchUsageCommand,
  repos: Pick<UsageRepos, "searchUsageReservations">,
): Promise<Result<void, DomainError>> {
  try {
    const reservation = await repos.searchUsageReservations.findById(command.reservationId);
    if (!reservation) {
      return Err(domainError("not_found", "reservation_not_found", "Reservation not found"));
    }
    await repos.searchUsageReservations.updateStatus(command.reservationId, "cancelled");
    return Ok(undefined);
  } catch (error) {
    return Err(domainError("unexpected", "unexpected", error instanceof Error ? error.message : "Failed to cancel search usage"));
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
    return Err(domainError("unexpected", "unexpected", error instanceof Error ? error.message : "Failed to grant search capacity"));
  }
}

export async function getSearchCapacitySnapshot(
  userId: UserId,
  repos: UsageRepos,
): Promise<Result<SearchCapacitySnapshot, DomainError>> {
  try {
    const policyResult = await getEffectiveSearchPolicy(userId, repos);
    if (!policyResult.ok) return policyResult;

    const { periodStart, periodEnd } = currentMonthlyPeriod(new Date());
    const [grants, reservations, commits] = await Promise.all([
      repos.searchCapacityGrants.findByUserAndPeriod(userId, periodStart, periodEnd),
      repos.searchUsageReservations.findByUserAndPeriod(userId, periodStart, periodEnd),
      repos.searchUsageCommits.findByUserAndPeriod(userId, periodStart, periodEnd),
    ]);

    return Ok(buildSearchCapacitySnapshot({ policy: policyResult.value, grants, reservations, commits, periodStart, periodEnd }));
  } catch (error) {
    return Err(domainError("unexpected", "unexpected", error instanceof Error ? error.message : "Failed to get search capacity snapshot"));
  }
}
