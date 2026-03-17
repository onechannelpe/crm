import { getEffectiveLeadPolicy } from "~/server/capacity-policy/lead-policy";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import {
  asLeadReservationId,
  type LeadReservationId,
  type UserId,
} from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import { currentDailyPeriod } from "~/server/shared/time";

import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "./repos";
import {
  buildLeadCapacitySnapshot,
  type LeadCapacitySnapshot,
} from "./snapshot";

export type { LeadCapacitySnapshot };

export interface ReserveLeadUsageCommand {
  actorUserId: UserId;
  amount: number;
  reason: "lead_refill" | "admin_grant_adjustment";
}

export interface CommitLeadUsageCommand {
  reservationId: LeadReservationId;
  amount: number;
}

export interface CancelLeadUsageCommand {
  reservationId: LeadReservationId;
  reason: "external_failure" | "partial_use" | "workflow_cancelled";
}

export interface GrantLeadCapacityCommand {
  actorUserId: UserId;
  targetUserId: UserId;
  amount: number;
  reason: string;
}

interface UsageRepos {
  users: {
    findById(
      id: UserId,
    ): Promise<{ team_id: number | null; branch_id: number } | undefined>;
  };
  leadPolicyDefaults: Parameters<
    typeof getEffectiveLeadPolicy
  >[1]["leadPolicyDefaults"];
  leadPolicyOverrides: Parameters<
    typeof getEffectiveLeadPolicy
  >[1]["leadPolicyOverrides"];
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
  leadAssignments: { countActiveByUser(userId: number): Promise<number> };
}

export async function reserveLeadUsage(
  command: ReserveLeadUsageCommand,
  repos: UsageRepos,
): Promise<Result<LeadReservationId, DomainError>> {
  try {
    const snapshotResult = await getLeadCapacitySnapshot(
      command.actorUserId,
      repos,
    );
    if (!snapshotResult.ok) return snapshotResult;

    if (snapshotResult.value.remaining < command.amount) {
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
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Failed to reserve lead usage",
      ),
    );
  }
}

export async function commitLeadUsage(
  command: CommitLeadUsageCommand,
  repos: Pick<UsageRepos, "leadUsageReservations" | "leadUsageCommits">,
): Promise<Result<void, DomainError>> {
  try {
    const reservation = await repos.leadUsageReservations.findById(
      command.reservationId,
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
      reservation_id: command.reservationId,
      amount: command.amount,
    });
    await repos.leadUsageReservations.updateAmountAndStatus(
      command.reservationId,
      command.amount,
      "committed",
    );
    return Ok(undefined);
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Failed to commit lead usage",
      ),
    );
  }
}

export async function cancelLeadUsage(
  command: CancelLeadUsageCommand,
  repos: Pick<UsageRepos, "leadUsageReservations">,
): Promise<Result<void, DomainError>> {
  try {
    const reservation = await repos.leadUsageReservations.findById(
      command.reservationId,
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
      command.reservationId,
      "cancelled",
    );
    return Ok(undefined);
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Failed to cancel lead usage",
      ),
    );
  }
}

export async function grantLeadCapacity(
  command: GrantLeadCapacityCommand,
  repos: Pick<UsageRepos, "leadCapacityGrants">,
): Promise<Result<void, DomainError>> {
  try {
    await repos.leadCapacityGrants.insert({
      user_id: command.targetUserId,
      amount: command.amount,
      reason: command.reason,
      actor_user_id: command.actorUserId,
    });
    return Ok(undefined);
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to grant lead capacity",
      ),
    );
  }
}

export async function getLeadCapacitySnapshot(
  userId: UserId,
  repos: UsageRepos,
): Promise<Result<LeadCapacitySnapshot, DomainError>> {
  try {
    const policyResult = await getEffectiveLeadPolicy(userId, repos);
    if (!policyResult.ok) return policyResult;

    const { date } = currentDailyPeriod(new Date());
    const [grants, reservations, commits, activeAssignments] =
      await Promise.all([
        repos.leadCapacityGrants.findByUserAndDate(userId, date),
        repos.leadUsageReservations.findByUserAndDate(userId, date),
        repos.leadUsageCommits.findByUserAndDate(userId, date),
        repos.leadAssignments.countActiveByUser(userId),
      ]);

    return Ok(
      buildLeadCapacitySnapshot({
        policy: policyResult.value,
        grants,
        reservations,
        commits,
        activeAssignments,
      }),
    );
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to get lead capacity snapshot",
      ),
    );
  }
}
