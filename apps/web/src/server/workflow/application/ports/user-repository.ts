import type {
  AssignableExecutivesScope,
  LeadUser,
  LeadUserWithName,
} from "../../ports/lead-user-scope-repository";

export type WorkflowUserRepository = {
  findById(id: number): Promise<LeadUser | undefined>;
  isExecutiveAssignable(
    scope: AssignableExecutivesScope,
    executiveId: number,
  ): Promise<boolean>;
  findByIds(ids: number[]): Promise<LeadUserWithName[]>;
  listAssignableExecutives(
    input: AssignableExecutivesScope,
    options?: { search?: string; limit?: number },
  ): Promise<LeadUserWithName[]>;
};
