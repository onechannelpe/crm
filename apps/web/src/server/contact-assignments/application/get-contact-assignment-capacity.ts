import {
  getLeadCapacitySnapshot,
  type LeadCapacitySnapshot,
} from "~/server/capacity/application/queries/get-lead-capacity-snapshot";
import type { DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";

import type { AssignmentPlanRepos } from "./assignment-plan";

export function getContactAssignmentCapacity(
  actorUserId: UserId,
  repos: AssignmentPlanRepos,
): Promise<Result<LeadCapacitySnapshot, DomainError>> {
  return getLeadCapacitySnapshot(actorUserId, repos);
}
