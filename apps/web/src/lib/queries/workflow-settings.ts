import { query } from "@solidjs/router";

import { queryRateProposalPolicy } from "~/actions/workflow/settings/rate-proposal-policy";

export const rateProposalPolicyQuery = query(
  queryRateProposalPolicy,
  "rateProposalPolicy",
);
