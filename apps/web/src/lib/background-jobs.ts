import { config } from "~/lib/config";
import { startQueueDoorbellSubscriber } from "~/lib/job-queue/doorbell-subscriber";
import { startStaleScanner } from "~/lib/job-queue/stale-scanner";
import type { QueueRunner } from "~/lib/job-queue/types";
import { createLogger } from "~/lib/observability/logger";
import { readStoredFile } from "~/server/files/storage";
import { createRecordsImportQueue } from "~/server/integrations/queue/records-import-queue";
import { getServerRuntime } from "~/server/runtime";
import { startAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";
import { startLeadReservationMaintenance } from "~/server/workflow/maintenance/lead-reservation-maintenance";

const WORKER_ID = `bg-${process.pid}`;
const logger = createLogger("background-jobs", { workerId: WORKER_ID });

export function startBackgroundJobs() {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  const { integration } = getServerRuntime().integrations;

  const recordsImportQueue = createRecordsImportQueue(WORKER_ID, {
    runtime: integration,
    readFile: (filePath) =>
      readStoredFile(config.uploads.storageRoot, filePath),
  });
  const enrichmentQueue =
    getServerRuntime().clientSearch.createEnrichmentQueue(WORKER_ID);
  const sunatEnrichmentWritebackQueue =
    getServerRuntime().workflow.createSunatEnrichmentWritebackQueue(WORKER_ID);
  const notificationsIntentQueue =
    getServerRuntime().notifications.createIntentQueue(WORKER_ID);
  const queues: QueueRunner[] = [
    recordsImportQueue,
    enrichmentQueue,
    sunatEnrichmentWritebackQueue,
    notificationsIntentQueue,
  ];
  const runAllQueues = () => {
    for (const queue of queues) {
      void queue.runOnce();
    }
  };

  startAccountLifecycleMaintenance({
    executor: getServerRuntime().infra.db,
    messaging: getServerRuntime().notifications.messaging,
    invalidateUserSessions: (userId) =>
      getServerRuntime().auth.sessionService.revokeAllForUser(userId),
  });

  // Release leads whose quotation hold on a RUC has lapsed.
  startLeadReservationMaintenance({
    executor: getServerRuntime().infra.db,
  });

  startStaleScanner(30_000);

  // Fallback: if no Redis doorbell fires, queues are still drained on each tick.
  setInterval(() => {
    runAllQueues();
  }, 30_000);

  void startQueueDoorbellSubscriber({
    RECORDS_IMPORT: () => {
      void recordsImportQueue.runOnce();
    },
    ENRICHMENT: () => {
      void enrichmentQueue.runOnce();
    },
    ENRICHMENT_WRITEBACK: () => {
      void sunatEnrichmentWritebackQueue.runOnce();
    },
    NOTIFICATIONS_INTENTS: () => {
      void notificationsIntentQueue.runOnce();
    },
  });

  runAllQueues();
}
