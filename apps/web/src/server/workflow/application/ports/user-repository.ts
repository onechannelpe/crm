import type {
  AssignableExecutivesScope,
  LeadUser,
  LeadUserWithName,
} from "../../ports/lead-user-scope-repository";

export type PipelineUser = LeadUser;
export type PipelineUserWithName = LeadUserWithName;

export type PipelineUserRepository = {
  findById(id: number): Promise<PipelineUser | undefined>;
  isExecutiveAssignable(
    scope: AssignableExecutivesScope,
    executiveId: number,
  ): Promise<boolean>;
  findByIds(ids: number[]): Promise<PipelineUserWithName[]>;
  listAssignableExecutives(
    input: AssignableExecutivesScope,
    options?: { search?: string; limit?: number },
  ): Promise<PipelineUserWithName[]>;
};
