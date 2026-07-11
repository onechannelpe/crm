import { sql, type Kysely } from "kysely";

import {
  decodeEventLogCursor,
  encodeEventLogCursor,
  type EventLogFilters,
  type EventLogQueryInput,
  type EventLogQueryResult,
  type EventLogRecord,
} from "~/contracts/event-logs/event-log";
import type { Database } from "~/lib/db/types";
import { invalid, type DomainError } from "~/server/shared/domain-error";
import { EventId, UserId } from "~/server/shared/ids";
import { parsePositiveIntegerAtMost } from "~/server/shared/query-window";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

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
  to?: Date;
}

function resolveWindow(filters: EventLogFilters | undefined): WindowBound {
  const range = filters?.dateRange;
  return {
    from: range?.start !== undefined ? new Date(range.start) : undefined,
    to: range?.end !== undefined ? new Date(range.end) : undefined,
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
    const eventType = filters?.eventType?.trim();
    const actorUserId = filters?.actorUserId?.trim();
    const onlyHighRisk = filters?.onlyHighRisk === true;

    let query = db
      .selectFrom("events")
      .leftJoin(
        "audit_action_policies as policy",
        "policy.action",
        "events.type",
      )
      .selectAll("events")
      .$if(window.from !== undefined, (qb) =>
        qb.where("events.occurred_at", ">=", window.from as Date),
      )
      .$if(window.to !== undefined, (qb) =>
        qb.where("events.occurred_at", "<=", window.to as Date),
      )
      .$if(eventType !== undefined && eventType.length > 0, (qb) =>
        qb.where("events.type", "ilike", `%${eventType}%`),
      )
      .$if(actorUserId !== undefined && actorUserId.length > 0, (qb) =>
        qb.where(
          "events.actor_user_id",
          "=",
          UserId.trust(actorUserId as string),
        ),
      )
      .$if(onlyHighRisk, (qb) =>
        qb.where((eb) =>
          eb.or([
            eb("policy.action", "is", null),
            eb.and([
              eb("policy.risk_level", "=", "high"),
              eb("policy.is_active", "=", true),
            ]),
          ]),
        ),
      );

    let countQuery = db
      .selectFrom("events")
      .leftJoin(
        "audit_action_policies as policy",
        "policy.action",
        "events.type",
      )
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .$if(window.from !== undefined, (qb) =>
        qb.where("events.occurred_at", ">=", window.from as Date),
      )
      .$if(window.to !== undefined, (qb) =>
        qb.where("events.occurred_at", "<=", window.to as Date),
      )
      .$if(eventType !== undefined && eventType.length > 0, (qb) =>
        qb.where("events.type", "ilike", `%${eventType}%`),
      )
      .$if(actorUserId !== undefined && actorUserId.length > 0, (qb) =>
        qb.where(
          "events.actor_user_id",
          "=",
          UserId.trust(actorUserId as string),
        ),
      )
      .$if(onlyHighRisk, (qb) =>
        qb.where((eb) =>
          eb.or([
            eb("policy.action", "is", null),
            eb.and([
              eb("policy.risk_level", "=", "high"),
              eb("policy.is_active", "=", true),
            ]),
          ]),
        ),
      );

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

    return buildPage(
      rows.map(mapDomainEventRow),
      Number(countRow?.count ?? 0),
      first,
    );
  }

  async function queryAction(
    filters: EventLogFilters | undefined,
    cursor: Cursor | null,
    first: number,
  ): Promise<EventLogQueryResult> {
    const window = resolveWindow(filters);
    const eventType = filters?.eventType?.trim();
    const actorUserId = filters?.actorUserId?.trim();
    const status = filters?.status?.trim();

    let query = db
      .selectFrom("action_observations")
      .selectAll()
      .$if(window.from !== undefined, (qb) =>
        qb.where("created_at", ">=", window.from as Date),
      )
      .$if(window.to !== undefined, (qb) =>
        qb.where("created_at", "<=", window.to as Date),
      )
      .$if(eventType !== undefined && eventType.length > 0, (qb) =>
        qb.where("action_name", "ilike", `%${eventType}%`),
      )
      .$if(actorUserId !== undefined && actorUserId.length > 0, (qb) =>
        qb.where("actor_user_id", "=", UserId.trust(actorUserId as string)),
      )
      .$if(status === "ok" || status === "error", (qb) =>
        qb.where("status", "=", status as "ok" | "error"),
      );

    const countQuery = db
      .selectFrom("action_observations")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .$if(window.from !== undefined, (qb) =>
        qb.where("created_at", ">=", window.from as Date),
      )
      .$if(window.to !== undefined, (qb) =>
        qb.where("created_at", "<=", window.to as Date),
      )
      .$if(eventType !== undefined && eventType.length > 0, (qb) =>
        qb.where("action_name", "ilike", `%${eventType}%`),
      )
      .$if(actorUserId !== undefined && actorUserId.length > 0, (qb) =>
        qb.where("actor_user_id", "=", UserId.trust(actorUserId as string)),
      )
      .$if(status === "ok" || status === "error", (qb) =>
        qb.where("status", "=", status as "ok" | "error"),
      );

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
      Number(countRow?.count ?? 0),
      first,
    );
  }

  async function queryAuth(
    filters: EventLogFilters | undefined,
    cursor: Cursor | null,
    first: number,
  ): Promise<EventLogQueryResult> {
    const window = resolveWindow(filters);
    const eventType = filters?.eventType?.trim();

    let query = db
      .selectFrom("auth_funnel_events")
      .selectAll()
      .$if(window.from !== undefined, (qb) =>
        qb.where("created_at", ">=", window.from as Date),
      )
      .$if(window.to !== undefined, (qb) =>
        qb.where("created_at", "<=", window.to as Date),
      )
      .$if(eventType !== undefined && eventType.length > 0, (qb) =>
        qb.where(sql<boolean>`event_name ilike ${`%${eventType}%`}`),
      );

    const countQuery = db
      .selectFrom("auth_funnel_events")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .$if(window.from !== undefined, (qb) =>
        qb.where("created_at", ">=", window.from as Date),
      )
      .$if(window.to !== undefined, (qb) =>
        qb.where("created_at", "<=", window.to as Date),
      )
      .$if(eventType !== undefined && eventType.length > 0, (qb) =>
        qb.where(sql<boolean>`event_name ilike ${`%${eventType}%`}`),
      );

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
      Number(countRow?.count ?? 0),
      first,
    );
  }

  return {
    async getEventLogs(
      input: EventLogQueryInput,
    ): Promise<Result<EventLogQueryResult, DomainError>> {
      const parsedFirst = parsePositiveIntegerAtMost(
        input.first ?? DEFAULT_FIRST,
        { code: "invalid_first", field: "first", max: MAX_FIRST },
      );
      if (isErr(parsedFirst)) return parsedFirst;

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

export type EventLogsService = ReturnType<typeof createEventLogsService>;
