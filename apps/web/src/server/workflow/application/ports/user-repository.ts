import type {
  AssignableExecutivesScope,
  LeadUser,
  LeadUserWithName,
} from "../../ports/lead-user-scope-repository";

export type WorkflowUser = LeadUser;
export type WorkflowUserWithName = LeadUserWithName;

export type WorkflowUserRepository = {
  findById(id: number): Promise<WorkflowUser | undefined>;
  isExecutiveAssignable(
    scope: AssignableExecutivesScope,
    executiveId: number,
  ): Promise<boolean>;
  findByIds(ids: number[]): Promise<WorkflowUserWithName[]>;
  listAssignableExecutives(
    input: AssignableExecutivesScope,
    options?: { search?: string; limit?: number },
  ): Promise<WorkflowUserWithName[]>;
};
