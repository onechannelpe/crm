import { action, json } from "@solidjs/router";

import { requestLeadCreation } from "~/actions/pipeline/commands/leads";

import { leadListQuery } from "./queries";

type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export const createLeadMutation = action(async (input: CreateLeadInput) => {
  const result = await requestLeadCreation(input);
  return json(result, { revalidate: leadListQuery.key });
}, "pipeline.createLead");
