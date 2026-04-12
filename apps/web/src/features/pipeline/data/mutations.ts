import { action, json } from "@solidjs/router";

import { requestLeadCreation } from "~/actions/pipeline/commands/leads";

import { leadListKeyFor } from "./queries";

type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export const createLeadMutation = action(async (input: CreateLeadInput) => {
  const result = await requestLeadCreation(input);

  const revalidate = [
    leadListKeyFor({}),
    leadListKeyFor({ stage: "PENDING_EXTERNAL_REVIEW" }),
    ...(input.executiveId !== undefined
      ? [leadListKeyFor({ executiveId: input.executiveId })]
      : []),
  ];

  return json(result, { revalidate });
}, "pipeline.createLead");
