import { action, json } from "@solidjs/router";

import {
  savePendingQuotationPolicy,
  type SavePendingQuotationPolicyInput,
} from "~/server/workflow/ui/pending-quotation-policy";
import { saveRateProposalPolicy } from "~/actions/workflow/settings/rate-proposal-policy.action";
import { pendingQuotationPolicyQuery } from "~/features/workflow/data/pending-quotation-policy.query";
import { rateProposalPolicyQuery } from "~/features/workflow/data/rate-proposal-policy.query";

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
