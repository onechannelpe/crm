import { query } from "@solidjs/router";

type GetEventLogs =
  (typeof import("~/actions/audit/event-logs.action"))["getEventLogs"];

export const eventLogsQuery = query(
  async (...args: Parameters<GetEventLogs>) => {
    "use server";

    const { getEventLogs } = await import("~/actions/audit/event-logs.action");
    return getEventLogs(...args);
  },
  "audit.event-logs",
);
