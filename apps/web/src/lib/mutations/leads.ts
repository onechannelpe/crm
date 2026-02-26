import { action, json } from "@solidjs/router";

import { registerCall, requestLeads } from "~/actions/leads";
import { activeLeadsQuery } from "~/lib/queries/leads";

export const requestLeadsMutation = action(async () => {
  const result = await requestLeads();
  return json(result, { revalidate: activeLeadsQuery.key });
}, "requestLeads");

export const registerCallMutation = action(
  async (
    assignmentId: number,
    contactId: number,
    outcome: string,
    notes?: string,
  ) => {
    await registerCall(assignmentId, contactId, outcome, notes);
    return json({}, { revalidate: activeLeadsQuery.key });
  },
  "registerCall",
);
