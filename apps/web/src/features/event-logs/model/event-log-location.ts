import {
  isEventLogStatus,
  isEventLogTable,
  type EventLogQueryInput,
} from "~/contracts/event-logs/event-log";

type Query = Record<string, string | string[] | undefined>;
const FIRST_PAGE_SIZE = 100;

function scalar(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function timestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function eventLogInputFromQuery(query: Query): EventLogQueryInput {
  const rawTable = scalar(query.table);
  const rawStatus = scalar(query.status);
  const start = timestamp(scalar(query.start));
  const end = timestamp(scalar(query.end));
  return {
    table: rawTable && isEventLogTable(rawTable) ? rawTable : "DOMAIN_EVENT",
    first: FIRST_PAGE_SIZE,
    filters: {
      eventType: scalar(query.eventType),
      actorUserId: scalar(query.actorUserId),
      status: rawStatus && isEventLogStatus(rawStatus) ? rawStatus : undefined,
      onlyHighRisk: scalar(query.onlyHighRisk) === "true" || undefined,
      dateRange:
        start !== undefined || end !== undefined ? { start, end } : undefined,
    },
  };
}

export function hasEventLogFilters(input: EventLogQueryInput): boolean {
  const filters = input.filters;
  return Boolean(
    filters?.eventType ||
    filters?.actorUserId ||
    filters?.status ||
    filters?.onlyHighRisk ||
    filters?.dateRange,
  );
}
