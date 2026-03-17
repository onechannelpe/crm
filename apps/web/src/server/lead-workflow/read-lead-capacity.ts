import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
} from "~/server/capacity-policy/repos";
import {
  getLeadCapacitySnapshot,
  type LeadCapacitySnapshot,
} from "~/server/capacity-usage/lead-usage";
import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

export type { LeadCapacitySnapshot };

interface ReadRepos {
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
  leadAssignments: { countActiveByUser(userId: number): Promise<number> };
}

export function getLeadCapacityForUser(
  userId: UserId,
  repos: ReadRepos,
): Promise<Result<LeadCapacitySnapshot, DomainError>> {
  return getLeadCapacitySnapshot(userId, repos);
}
