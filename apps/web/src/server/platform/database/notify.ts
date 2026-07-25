import { sql } from "kysely";
import { Client } from "pg";

import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createLogger } from "~/shared/observability/runtime-logger";

const logger = createLogger("pg-notify");

// Postgres releases transaction notifications on commit. Polling repairs missed wakes.
// Queue payloads only wake durable reads; realtime listeners re-sync after reconnect.
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
  onConnected?: () => void | Promise<void>;
}

const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 10_000;

// Full jitter: spreads reconnect attempts so a shared Postgres restart
// doesn't bring every listening process back on the same tick.
function withJitter(delayMs: number): number {
  return delayMs * (0.5 + Math.random());
}

// LISTEN uses one dedicated client. Every reconnect reissues the fixed channel set.
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
        // The connection is already broken.
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
      // Retry boot-time connection failures like live disconnects.
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
