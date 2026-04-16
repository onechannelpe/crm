import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type { GetLeadDetailInput } from "../contracts/query-inputs";
import type { LeadDetailResult } from "../contracts/query-results";
import { getLeadDetail } from "../queries/get-lead-detail";
import type { PipelineQueryApiDeps } from "./index";

export function getLeadDetailQuery(
  deps: PipelineQueryApiDeps,
  input: GetLeadDetailInput,
): Promise<Result<LeadDetailResult, DomainError>> {
  return getLeadDetail(deps.leadDetail, {
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    leadId: input.leadId,
  });
}
