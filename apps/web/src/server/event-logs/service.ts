import { sql, type Kysely } from "kysely";

import {
  decodeEventLogCursor,
  encodeEventLogCursor,
  type EventLogFilters,
  type EventLogQueryInput,
  type EventLogQueryResult,
  type EventLogRecord,
  type EventLogTable,
} from "~/contracts/event-logs/event-log";
import { invalid, type DomainError } from "~/domain/errors";
import { EventId, UserId } from "~/domain/ids";
import { appDayRange } from "~/domain/time/app-time";
import { parsePositiveIntegerAtMost } from "~/server/platform/action/query-window";
import type { Database } from "~/server/platform/database/types";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import {
  mapActionObservationRow,
  mapAuthFunnelEventRow,
  mapDomainEventRow,
} from "./mappers";

const DEFAULT_FIRST = 100;
const MAX_FIRST = 200;

type Cursor = { timestamp: number; id: string };

interface WindowBound {
  from?: Date;
  toExclusive?: Date;
}

function resolveWindow(filters: EventLogFilters | undefined): WindowBound {
  const range = filters?.dateRange;
  return {
    from: range?.start ? appDayRange(range.start).start : undefined,
    toExclusive: range?.end ? appDayRange(range.end).endExclusive : undefined,
  };
}

function buildPage(
  records: EventLogRecord[],
  totalCount: number,
  first: number,
) {
  const hasNextPage = records.length > first;
  const page = hasNextPage ? records.slice(0, first) : records;
  const last = page.at(-1);
  return {
    records: page,
    totalCount,
    pageInfo: {
      hasNextPage,
      endCursor: last
        ? encodeEventLogCursor({ timestamp: last.timestamp, id: last.id })
        : null,
    },
  } satisfies EventLogQueryResult;
}

export function createEventLogsService(db: Kysely<Database>) {
  async function queryDomain(
    filters: EventLogFilters | undefined,
    cursor: Cursor | null,
    first: number,
  ): Promise<EventLogQueryResult> {
    const window = resolveWindow(filters);
    const from = window.from;
    const to = window.toExclusive;
    const eventType = filters?.eventType?.trim();
    const actorUserId = filters?.actorUserId?.trim();
    const actorId = actorUserId ? UserId.trust(actorUserId) : undefined;
    const onlyHighRisk = filters?.onlyHighRisk === true;

    let query = db
      .selectFrom("events")
      .leftJoin(
        "audit_action_policies as policy",
        "policy.action",
        "events.type",
      )
      .selectAll("events");

    let countQuery = db
      .selectFrom("events")
      .leftJoin(
        "audit_action_policies as policy",
        "policy.action",
        "events.type",
      )
      .select((eb) => eb.fn.countAll<number>().as("count"));

    if (from) {
      query = query.where("events.occurred_at", ">=", from);
      countQuery = countQuery.where("events.occurred_at", ">=", from);
    }
    if (to) {
      query = query.where("events.occurred_at", "<", to);
      countQuery = countQuery.where("events.occurred_at", "<", to);
    }
    if (eventType) {
      const pattern = `%${eventType}%`;
      query = query.where("events.type", "ilike", pattern);
      countQuery = countQuery.where("events.type", "ilike", pattern);
    }
    if (actorId) {
      query = query.where("events.actor_user_id", "=", actorId);
      countQuery = countQuery.where("events.actor_user_id", "=", actorId);
    }
    if (onlyHighRisk) {
      query = query.where((eb) =>
        eb.or([
          eb("policy.action", "is", null),
          eb.and([
            eb("policy.risk_level", "=", "high"),
            eb("policy.is_active", "=", true),
          ]),
        ]),
      );
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("policy.action", "is", null),
          eb.and([
            eb("policy.risk_level", "=", "high"),
            eb("policy.is_active", "=", true),
          ]),
        ]),
      );
    }

    if (cursor) {
      const cursorDate = new Date(cursor.timestamp);
      query = query.where((eb) =>
        eb.or([
          eb("events.occurred_at", "<", cursorDate),
          eb.and([
            eb("events.occurred_at", "=", cursorDate),
            eb("events.id", "<", EventId.trust(cursor.id)),
          ]),
        ]),
      );
    }

    const [rows, countRow] = await Promise.all([
      query
        .orderBy("events.occurred_at", "desc")
        .orderBy("events.id", "desc")
        .limit(first + 1)
        .execute(),
      countQuery.executeTakeFirst(),
    ]);

    return buildPage(rows.map(mapDomainEventRow), countRow?.count ?? 0, first);
  }

  async function queryAction(
    filters: EventLogFilters | undefined,
    cursor: Cursor | null,
    first: number,
  ): Promise<EventLogQueryResult> {
    const window = resolveWindow(filters);
    const from = window.from;
    const to = window.toExclusive;
    const eventType = filters?.eventType?.trim();
    const actorUserId = filters?.actorUserId?.trim();
    const actorId = actorUserId ? UserId.trust(actorUserId) : undefined;
    const status = filters?.status;

    let query = db.selectFrom("action_observations").selectAll();

    let countQuery = db
      .selectFrom("action_observations")
      .select((eb) => eb.fn.countAll<number>().as("count"));

    if (from) {
      query = query.where("created_at", ">=", from);
      countQuery = countQuery.where("created_at", ">=", from);
    }
    if (to) {
      query = query.where("created_at", "<", to);
      countQuery = countQuery.where("created_at", "<", to);
    }
    if (eventType) {
      const pattern = `%${eventType}%`;
      query = query.where("action_name", "ilike", pattern);
      countQuery = countQuery.where("action_name", "ilike", pattern);
    }
    if (actorId) {
      query = query.where("actor_user_id", "=", actorId);
      countQuery = countQuery.where("actor_user_id", "=", actorId);
    }
    if (status) {
      query = query.where("status", "=", status);
      countQuery = countQuery.where("status", "=", status);
    }

    if (cursor) {
      const cursorDate = new Date(cursor.timestamp);
      query = query.where((eb) =>
        eb.or([
          eb("created_at", "<", cursorDate),
          eb.and([eb("created_at", "=", cursorDate), eb("id", "<", cursor.id)]),
        ]),
      );
    }

    const [rows, countRow] = await Promise.all([
      query
        .orderBy("created_at", "desc")
        .orderBy("id", "desc")
        .limit(first + 1)
        .execute(),
      countQuery.executeTakeFirst(),
    ]);

    return buildPage(
      rows.map(mapActionObservationRow),
      countRow?.count ?? 0,
      first,
    );
  }

  async function queryAuth(
    filters: EventLogFilters | undefined,
    cursor: Cursor | null,
    first: number,
  ): Promise<EventLogQueryResult> {
    const window = resolveWindow(filters);
    const from = window.from;
    const to = window.toExclusive;
    const eventType = filters?.eventType?.trim();

    let query = db.selectFrom("auth_funnel_events").selectAll();

    let countQuery = db
      .selectFrom("auth_funnel_events")
      .select((eb) => eb.fn.countAll<number>().as("count"));

    if (from) {
      query = query.where("created_at", ">=", from);
      countQuery = countQuery.where("created_at", ">=", from);
    }
    if (to) {
      query = query.where("created_at", "<", to);
      countQuery = countQuery.where("created_at", "<", to);
    }
    if (eventType) {
      const predicate = sql<boolean>`event_name ilike ${`%${eventType}%`}`;
      query = query.where(predicate);
      countQuery = countQuery.where(predicate);
    }

    if (cursor) {
      const cursorDate = new Date(cursor.timestamp);
      query = query.where((eb) =>
        eb.or([
          eb("created_at", "<", cursorDate),
          eb.and([eb("created_at", "=", cursorDate), eb("id", "<", cursor.id)]),
        ]),
      );
    }

    const [rows, countRow] = await Promise.all([
      query
        .orderBy("created_at", "desc")
        .orderBy("id", "desc")
        .limit(first + 1)
        .execute(),
      countQuery.executeTakeFirst(),
    ]);

    return buildPage(
      rows.map(mapAuthFunnelEventRow),
      countRow?.count ?? 0,
      first,
    );
  }

  // Ascending catch-up from a cursor, unfiltered: the live stream only runs
  // while no filters are active, so replay never needs to consider them.
  async function replayAfter(
    table: EventLogTable,
    cursor: Cursor,
    limit: number,
  ): Promise<EventLogRecord[]> {
    const cursorDate = new Date(cursor.timestamp);

    if (table === "DOMAIN_EVENT") {
      const rows = await db
        .selectFrom("events")
        .selectAll()
        .where((eb) =>
          eb.or([
            eb("occurred_at", ">", cursorDate),
            eb.and([
              eb("occurred_at", "=", cursorDate),
              eb("id", ">", EventId.trust(cursor.id)),
            ]),
          ]),
        )
        .orderBy("occurred_at", "asc")
        .orderBy("id", "asc")
        .limit(limit)
        .execute();
      return rows.map(mapDomainEventRow);
    }

    if (table === "ACTION_LOG") {
      const rows = await db
        .selectFrom("action_observations")
        .selectAll()
        .where((eb) =>
          eb.or([
            eb("created_at", ">", cursorDate),
            eb.and([
              eb("created_at", "=", cursorDate),
              eb("id", ">", cursor.id),
            ]),
          ]),
        )
        .orderBy("created_at", "asc")
        .orderBy("id", "asc")
        .limit(limit)
        .execute();
      return rows.map(mapActionObservationRow);
    }

    const rows = await db
      .selectFrom("auth_funnel_events")
      .selectAll()
      .where((eb) =>
        eb.or([
          eb("created_at", ">", cursorDate),
          eb.and([eb("created_at", "=", cursorDate), eb("id", ">", cursor.id)]),
        ]),
      )
      .orderBy("created_at", "asc")
      .orderBy("id", "asc")
      .limit(limit)
      .execute();
    return rows.map(mapAuthFunnelEventRow);
  }

  return {
    replayAfter,

    async getEventLogs(
      input: EventLogQueryInput,
    ): Promise<Result<EventLogQueryResult, DomainError>> {
      const parsedFirst = parsePositiveIntegerAtMost(
        input.first ?? DEFAULT_FIRST,
        { code: "invalid_first", field: "first", max: MAX_FIRST },
      );
      if (isErr(parsedFirst)) {
        return parsedFirst;
      }

      const cursor = input.after ? decodeEventLogCursor(input.after) : null;
      if (input.after && !cursor) {
        return Err(invalid({ code: "invalid_cursor" }));
      }

      const first = parsedFirst.value;
      const filters = input.filters;

      if (input.table === "DOMAIN_EVENT") {
        return Ok(await queryDomain(filters, cursor, first));
      }
      if (input.table === "ACTION_LOG") {
        return Ok(await queryAction(filters, cursor, first));
      }
      return Ok(await queryAuth(filters, cursor, first));
    },
  };
}

type EventLogsService = ReturnType<typeof createEventLogsService>;
