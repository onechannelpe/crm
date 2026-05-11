import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type { GetLeadDetailInput } from "../contracts/query-inputs";
import { getLeadDetail } from "../queries/get-lead-detail";
import type { LeadDetailView } from "../queries/views/lead-detail";
import type { WorkflowQueryApiDeps } from "./index";

export function getLeadDetailQuery(
  deps: WorkflowQueryApiDeps,
  input: GetLeadDetailInput,
): Promise<Result<LeadDetailView, DomainError>> {
  return getLeadDetail(deps.leadDetail, {
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    leadId: input.leadId,
  });
}
