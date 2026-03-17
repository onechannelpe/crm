import { createLeadPolicyService } from "~/server/lead-operations/policy-service";
import { createLeadRefillGrantService } from "~/server/lead-operations/refill-service";
import { createSearchAllowanceService } from "~/server/search-access/allowance-service";
import { createSearchPolicyService } from "~/server/search-access/policy-service";
import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";

export function createTransactionCapacityGrantServices(
  transactionRepos: Repositories,
) {
  const auditService = createAuditService(transactionRepos);
  const searchPolicyService = createSearchPolicyService(transactionRepos);
  const leadPolicyService = createLeadPolicyService(transactionRepos);

  return {
    searchAllowanceService: createSearchAllowanceService({
      repos: transactionRepos,
      policyService: searchPolicyService,
      auditService,
    }),
    leadRefillGrantService: createLeadRefillGrantService({
      repos: transactionRepos,
      policyService: leadPolicyService,
      auditService,
    }),
  };
}
