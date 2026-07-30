import { startSessionCleanupScheduler } from "~/server/auth/session/cleanup";
import { createRecordsImportQueue } from "~/server/integrations/queue/records-import-queue";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";
import { getClientSearchRuntime } from "~/server/platform/container/client-search-runtime";
import { getFilesRuntime } from "~/server/platform/container/files-runtime";
import { infra } from "~/server/platform/container/infra";
import { getIntegrationsRuntime } from "~/server/platform/container/integrations-runtime";
import { getMerchantStatsRuntime } from "~/server/platform/container/merchant-stats-runtime";
import { getNotificationsRuntime } from "~/server/platform/container/notifications-runtime";
import { dbUrl } from "~/server/platform/database/db";
import {
  createPgListener,
  type PgListenerHandler,
} from "~/server/platform/database/notify";
import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";
import type { QueueRunner } from "~/server/platform/jobs/types";
import { startAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";
import { startLeadReservationMaintenance } from "~/server/workflow/maintenance/lead-reservation-maintenance";
import { createLogger } from "~/shared/observability/runtime-logger";

const WORKER_ID = `bg-${process.pid}`;

// Polling recovers jobs missed when LISTEN/NOTIFY fails.
const POLL_FLOOR_MS = 1_000;

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

export function startMaintenanceWorker(): { stop(): Promise<void> } {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  const { integration } = getIntegrationsRuntime();

  const recordsImportQueue = createRecordsImportQueue(WORKER_ID, {
    runtime: integration,
    readFile: (storageKey) => getFilesRuntime().storage.getBytes(storageKey),
  });

  const gpvSnapshotQueue =
    getMerchantStatsRuntime().imports.createQueue(WORKER_ID);

  const enrichmentQueue =
    getClientSearchRuntime().createEnrichmentQueue(WORKER_ID);
  const notificationQueues = getNotificationsRuntime().createQueues(WORKER_ID);

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

  const stopAccountLifecycleMaintenance = startAccountLifecycleMaintenance({
    executor: infra.db,
    messaging: getNotificationsRuntime().messaging,
    invalidateUserSessions: (userId) =>
      getAuthRuntime().sessionService.revokeAllForUser(userId),
  });

  const stopLeadReservationMaintenance = startLeadReservationMaintenance({
    executor: infra.db,
  });
  const stopSessionCleanup = startSessionCleanupScheduler(infra.db);

  const pollTimer = setInterval(wakeAll, POLL_FLOOR_MS);

  const listener = createPgListener(dbUrl, channels);

  void listener.start();

  wakeAll();

  return {
    async stop() {
      clearInterval(pollTimer);
      stopAccountLifecycleMaintenance();
      stopLeadReservationMaintenance();
      stopSessionCleanup();
      await listener.stop();
    },
  };
}
