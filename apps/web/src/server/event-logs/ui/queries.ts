import {
  EVENT_LOG_TABLES,
  type EventLogStatus,
  type EventLogQueryInput,
  type EventLogQueryResult,
} from "~/contracts/event-logs/event-log";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function getEventLogs(
  rawParams: unknown,
): Promise<EventLogQueryResult> {
  return executeSessionServerFunction({
    name: "audit.event_logs.read",
    access: { kind: "permission", permission: "audit:read" },

    parse: () =>
      parseObject(
        rawParams,
        validationFail,
        (r) =>
          ({
            table: r.enum("table", EVENT_LOG_TABLES),
            first: r.optNum("first") ?? undefined,
            after: r.optStr("after") ?? undefined,
            filters: r.optObj("filters", (f) => ({
              eventType: f.optStr("eventType") ?? undefined,
              actorUserId: f.optStr("actorUserId") ?? undefined,
              status:
                f.optEnum("status", [
                  "ok",
                  "error",
                ] satisfies EventLogStatus[]) ?? undefined,
              onlyHighRisk: f.optBool("onlyHighRisk") ?? undefined,
              dateRange: f.optObj("dateRange", (d) => ({
                start: d.optCalendarDate("start") ?? undefined,
                end: d.optCalendarDate("end") ?? undefined,
              })),
            })),
          }) satisfies EventLogQueryInput,
      ),

    execute: (_ctx, input) => getApplication().eventLogs.getEventLogs(input),
  });
}
