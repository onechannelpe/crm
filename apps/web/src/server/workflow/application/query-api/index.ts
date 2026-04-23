import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type {
  GetLeadDetailInput,
  ListAssignableExecutivesInput,
} from "../contracts/query-inputs";
import type {
  AssignableExecutivesResult,
  LeadDetailResult,
} from "../contracts/query-results";
import type {
  AssignableExecutivesDeps,
  LeadDetailDeps,
} from "../deps/lead-queries";
import { getLeadDetailQuery } from "./get-lead-detail";
import { listAssignableExecutivesQuery } from "./list-assignable-executives";

export type PipelineQueryApiDeps = {
  leadDetail: LeadDetailDeps;
  assignableExecutives: AssignableExecutivesDeps;
};

export type PipelineQueryApi = {
  getLeadDetail(
    input: GetLeadDetailInput,
  ): Promise<Result<LeadDetailResult, DomainError>>;
  listAssignableExecutives(
    input: ListAssignableExecutivesInput,
  ): Promise<Result<AssignableExecutivesResult, DomainError>>;
};

export function createWorkflowQueryApi(
  deps: PipelineQueryApiDeps,
): PipelineQueryApi {
  return {
    getLeadDetail: (input) => getLeadDetailQuery(deps, input),
    listAssignableExecutives: (input) =>
      listAssignableExecutivesQuery(deps, input),
  };
}
