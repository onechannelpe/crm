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
import type { DomainError } from "~/server/shared/domain-error";
import type { LeadReservationId, UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

export type AssignmentCapacityRepos = {
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
};

export function reserveAssignmentCapacity(
  input: {
    actorUserId: UserId;
    requested: number;
    remainingCapacity: number;
  },
  repos: AssignmentCapacityRepos,
): Promise<Result<LeadReservationId, DomainError>> {
  return reserveLeadUsage(
    {
      actorUserId: input.actorUserId,
      amount: input.requested,
      remainingCapacity: input.remainingCapacity,
      reason: "lead_refill",
    },
    repos,
  );
}

export function cancelAssignmentReservation(
  reservationId: LeadReservationId,
  reason: "external_failure" | "partial_use",
  repos: AssignmentCapacityRepos,
) {
  return cancelLeadUsage({ reservationId, reason }, repos);
}

export function commitAssignmentReservation(
  input: {
    reservationId: LeadReservationId;
    assigned: number;
  },
  repos: AssignmentCapacityRepos,
) {
  return commitLeadUsage(
    {
      reservationId: input.reservationId,
      amount: input.assigned,
    },
    repos,
  );
}
