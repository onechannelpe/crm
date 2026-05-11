import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type {
  GetLeadDetailInput,
  ListAssignableExecutivesInput,
} from "../contracts/query-inputs";
import type { AssignableExecutivesResult } from "../contracts/query-results";
import type {
  AssignableExecutivesDeps,
  LeadDetailDeps,
} from "../deps/lead-queries";
import type { LeadDetailView } from "../queries/views/lead-detail";
import { getLeadDetailQuery } from "./get-lead-detail";
import { listAssignableExecutivesQuery } from "./list-assignable-executives";

export type WorkflowQueryApiDeps = {
  leadDetail: LeadDetailDeps;
  assignableExecutives: AssignableExecutivesDeps;
};

export type WorkflowQueryApi = {
  getLeadDetail(
    input: GetLeadDetailInput,
  ): Promise<Result<LeadDetailView, DomainError>>;
  listAssignableExecutives(
    input: ListAssignableExecutivesInput,
  ): Promise<Result<AssignableExecutivesResult, DomainError>>;
};

export function createWorkflowQueryApi(
  deps: WorkflowQueryApiDeps,
): WorkflowQueryApi {
  return {
    getLeadDetail: (input) => getLeadDetailQuery(deps, input),
    listAssignableExecutives: (input) =>
      listAssignableExecutivesQuery(deps, input),
  };
}
