import { query } from "@solidjs/router";

type QueryFulfillmentQueue =
  (typeof import("~/actions/workflow/queries/records.action"))["queryFulfillmentQueue"];

export const fulfillmentQueueQuery = query(
  async (...args: Parameters<QueryFulfillmentQueue>) => {
    "use server";

    const { queryFulfillmentQueue } =
      await import("~/actions/workflow/queries/records.action");
    return queryFulfillmentQueue(...args);
  },
  "workflow.fulfillment-queue",
);
