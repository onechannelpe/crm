import { action, json } from "@solidjs/router";

import { registerCall } from "~/actions/leads";
import { activeLeadsQuery } from "~/lib/queries/leads";

export const registerCallMutation = action(
  async (
    assignmentId: number,
    contactId: number,
    outcome: string,
    notes?: string,
  ) => {
    const result = await registerCall(assignmentId, contactId, outcome, notes);
    return json(result, { revalidate: activeLeadsQuery.key });
  },
  "registerCall",
);
