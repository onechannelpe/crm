import { action, json } from "@solidjs/router";

import { pendingQuotationPolicyQuery } from "~/rpc/workflow/pending-quotation-policy.query";
import { rateProposalPolicyQuery } from "~/rpc/workflow/rate-proposal-policy.query";
import {
  savePendingQuotationPolicy,
  type SavePendingQuotationPolicyInput,
} from "~/rpc/workflow/settings/pending-quotation-policy.action";
import { saveRateProposalPolicy } from "~/rpc/workflow/settings/rate-proposal-policy.action";

export const updateRateProposalPolicyMutation = action(
  async (input: { validityDays: number }) => {
    const result = await saveRateProposalPolicy(input);
    return json(result, {
      revalidate: [rateProposalPolicyQuery.key],
    });
  },
  "workflow.updateRateProposalPolicy",
);

export const updatePendingQuotationPolicyMutation = action(
  async (input: SavePendingQuotationPolicyInput) => {
    const result = await savePendingQuotationPolicy(input);
    return json(result, {
      revalidate: [pendingQuotationPolicyQuery.key],
    });
  },
  "workflow.updatePendingQuotationPolicy",
);
