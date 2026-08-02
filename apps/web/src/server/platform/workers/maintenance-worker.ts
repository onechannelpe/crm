import { application } from "~/server/composition/application";
import { dbUrl } from "~/server/platform/database/db";
import {
  createPgListener,
  type PgListenerHandler,
} from "~/server/platform/database/notify";
import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";
import type { QueueRunner } from "~/server/platform/jobs/types";
import type { OperationContext } from "~/server/platform/operation/context";
import { createLogger } from "~/shared/observability/runtime-logger";

const WORKER_ID = `bg-${process.pid}`;

// Polling recovers jobs missed when LISTEN/NOTIFY fails.
const POLL_FLOOR_MS = 1_000;
const ACCOUNT_EXPIRY_INTERVAL_MS = 60_000;
const EXPIRY_NOTIFICATION_INTERVAL_MS = 24 * 60 * 60_000;
const RESERVATION_SWEEP_INTERVAL_MS = 60_000;
const SESSION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const logger = createLogger("background-jobs", { workerId: WORKER_ID });

function makeWaker(run: () => Promise<void>): () => void {
  let running = false;
  let pending = false;

  const tick = async (): Promise<void> => {
    if (running) {
      pending = true;
      return;
    }

    running = true;

    try {
      await run();
    } catch (error: unknown) {
      logger.error("queue_run_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      running = false;

      // Multiple wakes during a drain trigger one additional drain.
      if (pending) {
        pending = false;
        void tick();
      }
    }
  };

  return () => {
    void tick();
  };
}

function startScheduledTick(
  label: string,
  intervalMs: number,
  run: (context: OperationContext) => Promise<void>,
): () => void {
  const execute = async () => {
    try {
      // clock-boundary: scheduled tick. Each firing is its own inbound event,
      // so every row this sweep touches carries the same instant.
      await run({ operationAt: new Date() });
    } catch (error: unknown) {
      logger.error("scheduled_tick_failed", {
        tick: label,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const timer = setInterval(() => void execute(), intervalMs);

  return () => clearInterval(timer);
}

export function startMaintenanceWorker(): { stop(): Promise<void> } {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  const recordsImportQueue =
    application.maintenance.createRecordsImportQueue(WORKER_ID);

  const gpvSnapshotQueue =
    application.merchantStats.imports.createQueue(WORKER_ID);

  const enrichmentQueue =
    application.clientSearch.createEnrichmentQueue(WORKER_ID);
  const notificationQueues = application.notifications.createQueues(WORKER_ID);

  const queuesByChannel: Record<string, QueueRunner[]> = {
    [JOB_TABLE_CHANNELS.workflow_integration_jobs]: [recordsImportQueue],
    [JOB_TABLE_CHANNELS.gpv_snapshot_jobs]: [gpvSnapshotQueue],
    [JOB_TABLE_CHANNELS.company_registry_record]: [enrichmentQueue],
    [JOB_TABLE_CHANNELS.notification_intents]: [notificationQueues.expansion],
    [JOB_TABLE_CHANNELS.notification_deliveries]: [notificationQueues.dispatch],
    [JOB_TABLE_CHANNELS.whatsapp_inbound_events]: [
      notificationQueues.whatsappInbound,
    ],
    [JOB_TABLE_CHANNELS.outbound_whatsapp_messages]: [
      notificationQueues.outboundWhatsApp,
    ],
  };

  const wakers = new Map<string, () => void>();
  const channels: Record<string, PgListenerHandler[]> = {};

  for (const [channel, queues] of Object.entries(queuesByChannel)) {
    const wake = makeWaker(async () => {
      await Promise.all(queues.map((queue) => queue.drain()));
    });

    wakers.set(channel, wake);
    channels[channel] = [wake];
  }

  const wakeAll = () => {
    for (const wake of wakers.values()) {
      wake();
    }
  };

  const stopAccountExpiry = startScheduledTick(
    "account-expiry",
    ACCOUNT_EXPIRY_INTERVAL_MS,
    application.maintenance.accountLifecycle.expireAccounts,
  );
  const stopExpiryNotification = startScheduledTick(
    "expiry-notification",
    EXPIRY_NOTIFICATION_INTERVAL_MS,
    application.maintenance.accountLifecycle.notifyExpiringAccounts,
  );
  const stopReservationSweep = startScheduledTick(
    "reservation-sweep",
    RESERVATION_SWEEP_INTERVAL_MS,
    application.maintenance.leadReservation.sweepReservations,
  );
  const stopSessionCleanup = startScheduledTick(
    "session-cleanup",
    SESSION_CLEANUP_INTERVAL_MS,
    application.maintenance.cleanupSessions,
  );

  const pollTimer = setInterval(wakeAll, POLL_FLOOR_MS);

  const listener = createPgListener(dbUrl, channels);

  void listener.start();

  wakeAll();

  return {
    async stop() {
      clearInterval(pollTimer);
      stopAccountExpiry();
      stopExpiryNotification();
      stopReservationSweep();
      stopSessionCleanup();
      await listener.stop();
    },
  };
}
