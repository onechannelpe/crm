import { sql } from "kysely";
import { Client } from "pg";

import { createLogger } from "~/lib/observability/logger";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

const logger = createLogger("pg-notify");

// Fire a NOTIFY on `executor`. When `executor` is a transaction, Postgres holds
// the notification until commit, so the consumer never wakes for work that has
// not landed. Outside a transaction it delivers immediately. Either way the
// wake is best-effort: a missed NOTIFY is caught by the poll floor.
//
// `payload` defaults to empty for queue doorbells, where persistence is
// authoritative and the wake only says "look now". The realtime bridge passes a
// serialized event instead, riding the NOTIFY directly (events are well under
// Postgres's 8000-byte payload ceiling), so subscribers need no fetch-back.
export function notify(
  executor: DatabaseExecutor,
  channel: string,
  payload = "",
): void {
  void sql`select pg_notify(${channel}, ${payload})`
    .execute(executor)
    .catch((error: unknown) => {
      logger.error("pg_notify_failed", {
        channel,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });
}

// Handlers receive the NOTIFY payload. Queue wakers ignore it (channel-only
// doorbell); the realtime bridge parses it into an event.
export type PgListenerHandler = (payload: string) => void;

export interface PgListener {
  on(channel: string, handler: PgListenerHandler): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * A single dedicated, non-pooled `pg.Client` running `LISTEN` for every
 * registered channel and dispatching each notification to its handler. It is
 * deliberately off the pool: a listening connection is long-lived and must not
 * be recycled mid-LISTEN. On connection loss it reconnects with backoff and
 * re-issues every LISTEN so no wake is permanently lost.
 */
export function createPgListener(connectionString: string): PgListener {
  const handlers = new Map<string, PgListenerHandler[]>();
  let client: Client | null = null;
  let stopped = false;
  let reconnectDelayMs = 500;

  async function connect(): Promise<void> {
    if (stopped) return;

    const next = new Client({ connectionString });
    next.on("notification", (message) => {
      const channelHandlers = handlers.get(message.channel);
      if (!channelHandlers) return;
      for (const handler of channelHandlers) {
        try {
          handler(message.payload ?? "");
        } catch (error: unknown) {
          logger.error("listener_handler_failed", {
            channel: message.channel,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    });
    next.on("error", (error: unknown) => {
      logger.error("listener_connection_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      void reconnect();
    });

    await next.connect();
    for (const channel of handlers.keys()) {
      await next.query(`LISTEN "${channel}"`);
    }
    client = next;
    reconnectDelayMs = 500;
    logger.info("listener_connected", { channels: [...handlers.keys()] });
  }

  async function reconnect(): Promise<void> {
    if (stopped) return;
    const old = client;
    client = null;
    if (old) {
      try {
        await old.end();
      } catch {
        // ignore: the connection is already broken.
      }
    }
    const delay = reconnectDelayMs;
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, 10_000);
    await new Promise((resolve) => setTimeout(resolve, delay));
    await connect().catch(() => void reconnect());
  }

  return {
    on(channel, handler) {
      const existing = handlers.get(channel) ?? [];
      existing.push(handler);
      handlers.set(channel, existing);
    },
    async start() {
      stopped = false;
      await connect();
    },
    async stop() {
      stopped = true;
      const current = client;
      client = null;
      if (current) {
        await current.end();
      }
    },
  };
}
