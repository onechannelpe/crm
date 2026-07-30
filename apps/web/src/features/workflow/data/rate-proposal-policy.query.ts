import { query } from "@solidjs/router";

type QueryRateProposalPolicy =
  (typeof import("~/actions/workflow/settings/rate-proposal-policy.action"))["queryRateProposalPolicy"];

export const rateProposalPolicyQuery = query(
  async (...args: Parameters<QueryRateProposalPolicy>) => {
    "use server";

    const { queryRateProposalPolicy } =
      await import("~/actions/workflow/settings/rate-proposal-policy.action");
    return queryRateProposalPolicy(...args);
  },
  "workflow.rate-proposal-policy",
);
