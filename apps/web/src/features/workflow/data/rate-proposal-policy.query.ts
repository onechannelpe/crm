import { query } from "@solidjs/router";

import { queryRateProposalPolicy } from "~/server/workflow/ui/rate-proposal-policy";

export const rateProposalPolicyQuery = query(
  async () => {
    "use server";
    return queryRateProposalPolicy();
  },
  "workflow.rate-proposal-policy",
);
