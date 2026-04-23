import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import { Err, type Result } from "~/server/shared/result";

import type { ListAssignableExecutivesInput } from "../contracts/query-inputs";
import type { AssignableExecutivesResult } from "../contracts/query-results";
import { listAssignableExecutives } from "../queries/list-assignable-executives";
import type { WorkflowQueryApiDeps } from "./index";

export async function listAssignableExecutivesQuery(
  deps: WorkflowQueryApiDeps,
  input: ListAssignableExecutivesInput,
): Promise<Result<AssignableExecutivesResult, DomainError>> {
  if (input.actor.branchId == null) {
    return Err(
      domainError("validation", "missing_branch", "Branch context is required"),
    );
  }

  return listAssignableExecutives(deps.assignableExecutives, {
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    actorBranchId: input.actor.branchId,
    leadId: input.leadId,
    search: input.search,
    limit: input.limit,
  });
}
