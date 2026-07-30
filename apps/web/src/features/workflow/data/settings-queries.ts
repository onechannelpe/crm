import { query } from "@solidjs/router";

import { queryPendingQuotationPolicy } from "~/actions/workflow/settings/pending-quotation-policy.action";
import { queryRateProposalPolicy } from "~/actions/workflow/settings/rate-proposal-policy.action";

export const rateProposalPolicyQuery = query(
  queryRateProposalPolicy,
  "rateProposalPolicy",
);

export const pendingQuotationPolicyQuery = query(
  queryPendingQuotationPolicy,
  "pendingQuotationPolicy",
);
