import { query } from "@solidjs/router";

import { getEventLogs } from "~/server/event-logs/ui/queries";

export const eventLogsQuery = query(
  async (input: unknown) => {
    "use server";
    return getEventLogs(input);
  },
  "audit.event-logs",
);
