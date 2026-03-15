import { action, json } from "@solidjs/router";

import { requestLeadRefillNow } from "~/actions/lead-operations/refill";
import { managedExecutivesQuery } from "~/lib/queries/capacity";
import { myLeadCapacityQuery } from "~/lib/queries/lead-operations";
import { activeLeadsQuery } from "~/lib/queries/leads";

export const requestLeadRefillNowMutation = action(async () => {
  const result = await requestLeadRefillNow();
  return json(result, {
    revalidate: [
      activeLeadsQuery.key,
      myLeadCapacityQuery.key,
      managedExecutivesQuery.key,
    ],
  });
}, "requestLeadRefillNow");
