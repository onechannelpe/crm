import { dbUrl } from "~/lib/db/db";
import { createPgListener, type PgListenerHandler } from "~/lib/db/notify";
import { uploadsConfig } from "~/lib/env";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import { startStaleScanner } from "~/lib/job-queue/stale-scanner";
import type { QueueRunner } from "~/lib/job-queue/types";
import { createLogger } from "~/lib/observability/logger";
import { readStoredFile } from "~/server/files/storage";
import { createRecordsImportQueue } from "~/server/integrations/queue/records-import-queue";
import { getServerRuntime } from "~/server/platform/container";
import { startAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";
import { startLeadReservationMaintenance } from "~/server/workflow/maintenance/lead-reservation-maintenance";

const WORKER_ID = `bg-${process.pid}`;
const logger = createLogger("background-jobs", { workerId: WORKER_ID });

// A lost LISTEN/NOTIFY wake is recovered within POLL_FLOOR_MS.
const POLL_FLOOR_MS = 1_000;

// Coalesces a queue's wakeups (NOTIFY bursts plus the poll floor) into at
// most one in-flight `runOnce` with at most one queued behind it, so a
// burst of notifications for the same queue collapses into a single fetch.
function makeWaker(run: () => Promise<void>): () => void {
  let running = false;
  let pending = false;

  const tick = async () => {
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
      if (pending) {
        pending = false;
        void tick();
      }
    }
  };

  return () => void tick();
}

export function startBackgroundJobs() {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  const { integration } = getServerRuntime().integrations;

  const recordsImportQueue = createRecordsImportQueue(WORKER_ID, {
    runtime: integration,
    readFile: (filePath) =>
      readStoredFile(uploadsConfig().storageRoot, filePath),
  });
  const enrichmentQueue =
    getServerRuntime().clientSearch.createEnrichmentQueue(WORKER_ID);
  const notificationQueues =
    getServerRuntime().notifications.createQueues(WORKER_ID);

  const queueByChannel: Record<string, QueueRunner> = {
    [JOB_TABLE_CHANNELS.workflow_integration_jobs]: recordsImportQueue,
    [JOB_TABLE_CHANNELS.company_registry_record]: enrichmentQueue,
    [JOB_TABLE_CHANNELS.notification_intents]: notificationQueues.expansion,
    [JOB_TABLE_CHANNELS.notification_deliveries]: notificationQueues.dispatch,
    [JOB_TABLE_CHANNELS.whatsapp_inbound_events]:
      notificationQueues.whatsappInbound,
    [JOB_TABLE_CHANNELS.outbound_whatsapp_messages]:
      notificationQueues.outboundWhatsApp,
  };

  const wakers = new Map<string, () => void>();
  const channels: Record<string, PgListenerHandler[]> = {};
  for (const [channel, queue] of Object.entries(queueByChannel)) {
    const wake = makeWaker(() => queue.runOnce());
    wakers.set(channel, wake);
    channels[channel] = [wake];
  }

  const wakeAll = () => {
    for (const wake of wakers.values()) {
      wake();
    }
  };

  startAccountLifecycleMaintenance({
    executor: getServerRuntime().infra.db,
    messaging: getServerRuntime().notifications.messaging,
    invalidateUserSessions: (userId) =>
      getServerRuntime().auth.sessionService.revokeAllForUser(userId),
  });

  startLeadReservationMaintenance({
    executor: getServerRuntime().infra.db,
  });

  startStaleScanner(30_000);

  setInterval(wakeAll, POLL_FLOOR_MS);

  const listener = createPgListener(dbUrl, channels);
  void listener.start();

  wakeAll();
}
