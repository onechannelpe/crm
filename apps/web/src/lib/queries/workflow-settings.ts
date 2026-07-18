import { query } from "@solidjs/router";

import { queryPendingQuotationPolicy } from "~/actions/workflow/settings/pending-quotation-policy";
import { queryRateProposalPolicy } from "~/actions/workflow/settings/rate-proposal-policy";

export const rateProposalPolicyQuery = query(
  queryRateProposalPolicy,
  "rateProposalPolicy",
);

export const pendingQuotationPolicyQuery = query(
  queryPendingQuotationPolicy,
  "pendingQuotationPolicy",
);
