import { sql } from "kysely";
import { Client } from "pg";

import { createLogger } from "~/lib/observability/logger";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

const logger = createLogger("pg-notify");

// Inside a transaction, Postgres holds the notification until commit, so the
// consumer never wakes for work that has not landed. Outside a transaction it
// delivers immediately. Either way the wake is best-effort: a missed NOTIFY
// is caught by the poll floor.
//
// `payload` defaults to empty for queue doorbells, where persistence is
// authoritative and the wake only says "look now". The realtime bridge
// passes a serialized event instead, riding the NOTIFY directly (events are
// under Postgres's 8000-byte payload ceiling). That still isn't a durable
// transport: a listener that reconnects can miss events sent during the
// gap, so bridges pass `onConnected` to re-sync from durable state after
// every (re)connect instead of trusting the stream alone.
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

// Queue wakers ignore the payload; the realtime bridge parses it.
export type PgListenerHandler = (payload: string) => void;

export interface PgListener {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface PgListenerOptions {
  // Runs after every successful connect, including the first.
  onConnected?: () => void | Promise<void>;
}

const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 10_000;

// Full jitter: spreads reconnect attempts so a shared Postgres restart
// doesn't bring every listening process back on the same tick.
function withJitter(delayMs: number): number {
  return delayMs * (0.5 + Math.random());
}

// A single dedicated, non-pooled `pg.Client` runs LISTEN for every channel in
// `channels`. The channel set is fixed at creation, so there is no window
// where a channel is registered after the client has already connected and
// silently misses its LISTEN until the next reconnect. On connection loss it
// reconnects with backoff and re-issues every LISTEN so no wake is
// permanently lost.
export function createPgListener(
  connectionString: string,
  channels: Record<string, PgListenerHandler[]>,
  options: PgListenerOptions = {},
): PgListener {
  let client: Client | null = null;
  let stopped = false;
  let reconnectDelayMs = RECONNECT_BASE_DELAY_MS;

  async function connect(): Promise<void> {
    if (stopped) return;

    const next = new Client({ connectionString });
    next.on("notification", (message) => {
      const channelHandlers = channels[message.channel];
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
    // A pg.Client is a single connection, not a pool: issuing LISTEN queries
    // concurrently overlaps calls on the same client, which pg deprecates.
    for (const channel of Object.keys(channels)) {
      // eslint-disable-next-line no-await-in-loop
      await next.query(`LISTEN "${channel}"`);
    }
    client = next;
    reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
    logger.info("listener_connected", { channels: Object.keys(channels) });

    try {
      await options.onConnected?.();
    } catch (error: unknown) {
      logger.error("listener_onconnected_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS);
    await new Promise((resolve) => setTimeout(resolve, withJitter(delay)));
    await connect().catch(() => void reconnect());
  }

  return {
    async start() {
      stopped = false;
      // Route the first attempt through the same retry path a live drop
      // uses: a blip at boot must retry, not disable NOTIFY delivery for
      // the rest of the process's life.
      await connect().catch(() => void reconnect());
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
