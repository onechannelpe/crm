import { action, json } from "@solidjs/router";

import { refillLeads } from "~/actions/leads/refill";
import { managedExecutivesQuery } from "~/lib/queries/capacity";
import { myLeadCapacityQuery } from "~/lib/queries/lead-operations";
import { activeLeadsQuery } from "~/lib/queries/leads";

export const requestLeadRefillNowMutation = action(async () => {
  const result = await refillLeads();
  return json(result, {
    revalidate: [
      activeLeadsQuery.key,
      myLeadCapacityQuery.key,
      managedExecutivesQuery.key,
    ],
  });
}, "requestLeadRefillNow");
