import { action, json } from "@solidjs/router";

import { saveRateProposalPolicy } from "~/actions/workflow/settings/rate-proposal-policy";
import { rateProposalPolicyQuery } from "~/lib/queries/workflow-settings";

export const updateRateProposalPolicyMutation = action(
  async (input: { validityDays: number }) => {
    const result = await saveRateProposalPolicy(input);
    return json(result, {
      revalidate: [rateProposalPolicyQuery.key],
    });
  },
  "workflow.updateRateProposalPolicy",
);
