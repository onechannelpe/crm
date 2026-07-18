import { action, json } from "@solidjs/router";

import { savePendingQuotationPolicy } from "~/actions/workflow/settings/pending-quotation-policy";
import { saveRateProposalPolicy } from "~/actions/workflow/settings/rate-proposal-policy";
import {
  pendingQuotationPolicyQuery,
  rateProposalPolicyQuery,
} from "~/lib/queries/workflow-settings";

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
  async (input: { enabled: boolean; limit: number }) => {
    const result = await savePendingQuotationPolicy(input);
    return json(result, {
      revalidate: [pendingQuotationPolicyQuery.key],
    });
  },
  "workflow.updatePendingQuotationPolicy",
);
