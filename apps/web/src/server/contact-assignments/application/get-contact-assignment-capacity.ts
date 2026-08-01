import type { DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import {
  getLeadCapacitySnapshot,
  type LeadCapacitySnapshot,
} from "~/server/capacity/application/queries/get-lead-capacity-snapshot";
import type { Result } from "~/shared/result";

import type { AssignmentPlanRepos } from "./assignment-plan";

export function getContactAssignmentCapacity(
  actorUserId: UserId,
  repos: AssignmentPlanRepos,
  evaluatedAt: Date,
): Promise<Result<LeadCapacitySnapshot, DomainError>> {
  return getLeadCapacitySnapshot(actorUserId, repos, evaluatedAt);
}
