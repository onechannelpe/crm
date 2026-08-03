import type { DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { appCalendarDateAt, appDayRange } from "~/domain/time/app-time";
import {
  buildLeadCapacitySnapshot,
  type LeadCapacitySnapshot,
} from "~/server/capacity/domain/snapshot";
import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import type { OperationContext } from "~/server/platform/operation/context";
import { Ok, type Result } from "~/shared/result";

import type { ActorScope } from "../actor-scope";
import { getEffectiveLeadPolicy } from "../resolve-lead-policy";

interface SnapshotRepos {
  users: {
    findById(id: UserId): Promise<ActorScope | undefined>;
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
  contactAssignments: {
    countActiveByUser(userId: UserId, activeAsOf: Date): Promise<number>;
  };
}

export async function getLeadCapacitySnapshot(
  userId: UserId,
  repos: SnapshotRepos,
  operation: OperationContext,
): Promise<Result<LeadCapacitySnapshot, DomainError>> {
  const policyResult = await getEffectiveLeadPolicy(userId, repos, operation);
  if (!policyResult.ok) return policyResult;

  const range = appDayRange(appCalendarDateAt(operation.operationAt));
  const [grants, reservations, commits, activeAssignments] = await Promise.all([
    repos.leadCapacityGrants.findByUserAndRange(userId, range),
    repos.leadUsageReservations.findByUserAndRange(userId, range),
    repos.leadUsageCommits.findByUserAndRange(userId, range),
    repos.contactAssignments.countActiveByUser(userId, operation.operationAt),
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
}

export type { LeadCapacitySnapshot };
