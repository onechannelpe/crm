import type { UserId } from "~/server/shared/ids";

import type {
  AssignableExecutivesScope,
  LeadUser,
  LeadUserWithName,
} from "../../ports/lead-user-scope-repository";

export type PipelineUser = LeadUser;
export type PipelineUserWithName = LeadUserWithName;

export type PipelineUserRepository = {
  findById(id: UserId): Promise<PipelineUser | undefined>;
  isExecutiveAssignable(
    scope: AssignableExecutivesScope,
    executiveId: UserId,
  ): Promise<boolean>;
  findByIds(ids: UserId[]): Promise<PipelineUserWithName[]>;
  listAssignableExecutives(
    input: AssignableExecutivesScope,
    options?: { search?: string; limit?: number },
  ): Promise<PipelineUserWithName[]>;
};
