"use server";

import {
  EVENT_LOG_TABLES,
  type EventLogStatus,
  type EventLogQueryInput,
  type EventLogQueryResult,
} from "~/contracts/event-logs/event-log";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";

export async function getEventLogs(
  rawParams: unknown,
): Promise<EventLogQueryResult> {
  return runAction({
    name: "audit.event_logs.read",
    access: { kind: "permission", permission: "audit:read" },

    parse: () =>
      parseObject(rawParams, validationFail, (r) => {
        const input: EventLogQueryInput = {
          table: r.enum("table", EVENT_LOG_TABLES),
          first: r.optNum("first") ?? undefined,
          after: r.optStr("after") ?? undefined,
          filters: r.optObj("filters", (f) => ({
            eventType: f.optStr("eventType") ?? undefined,
            actorUserId: f.optStr("actorUserId") ?? undefined,
            status:
              f.optEnum("status", ["ok", "error"] satisfies EventLogStatus[]) ??
              undefined,
            onlyHighRisk: f.optBool("onlyHighRisk") ?? undefined,
            dateRange: f.optObj("dateRange", (d) => ({
              start: d.optNum("start") ?? undefined,
              end: d.optNum("end") ?? undefined,
            })),
          })),
        };
        return input;
      }),

    execute: (_ctx, input) =>
      getServerRuntime().eventLogs.eventLogsService.getEventLogs(input),
  });
}
