import type { WorkflowUserRepository } from "../../application/ports/user-repository";
import type { LeadUserScopeRepository } from "../../ports/lead-user-scope-repository";

export function createLeadUserScopeRepository(
  users: WorkflowUserRepository,
): LeadUserScopeRepository {
  return {
    findUserById(id) {
      return users.findById(id);
    },
    isExecutiveAssignable(scope, executiveId) {
      return users.isExecutiveAssignable(scope, executiveId);
    },
    listAssignableExecutives(scope, options) {
      return users.listAssignableExecutives(scope, options);
    },
  };
}
