import { query } from "@solidjs/router";

import { getEventLogs } from "~/actions/audit/event-logs";

// SSR-cached first page. Subsequent keyset pages are fetched client-side by
// calling getEventLogs directly (see use-query-event-logs).
export const eventLogsQuery = query(getEventLogs, "eventLogs");
