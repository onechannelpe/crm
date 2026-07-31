import { query } from "@solidjs/router";

import { queryFulfillmentQueue } from "~/server/workflow/ui/records";

export const fulfillmentQueueQuery = query(async () => {
  "use server";
  return queryFulfillmentQueue();
}, "workflow.fulfillment-queue");
