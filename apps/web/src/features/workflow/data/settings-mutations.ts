import { action, json } from "@solidjs/router";

import {
  savePendingQuotationPolicy,
  type SavePendingQuotationPolicyInput,
} from "~/actions/workflow/settings/pending-quotation-policy";
import { saveRateProposalPolicy } from "~/actions/workflow/settings/rate-proposal-policy";
import {
  pendingQuotationPolicyQuery,
  rateProposalPolicyQuery,
} from "~/features/workflow/data/settings-queries";

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
