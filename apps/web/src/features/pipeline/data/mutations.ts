import { action, json } from "@solidjs/router";

import { requestLeadCreation } from "~/actions/pipeline/commands/leads";

import { leadListKeyForId } from "./queries";

type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export const LEAD_LIST_REVALIDATE_KEYS_ON_CREATE = [
  leadListKeyForId("all"),
  leadListKeyForId("review"),
];

export const createLeadMutation = action(async (input: CreateLeadInput) => {
  const result = await requestLeadCreation(input);

  return json(result, {
    revalidate: LEAD_LIST_REVALIDATE_KEYS_ON_CREATE,
  });
}, "pipeline.createLead");
