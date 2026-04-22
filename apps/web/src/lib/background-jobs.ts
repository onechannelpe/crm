import { config } from "~/lib/config";
import { startQueueDoorbellSubscriber } from "~/lib/job-queue/doorbell-subscriber";
import { startStaleScanner } from "~/lib/job-queue/stale-scanner";
import type { QueueRunner } from "~/lib/job-queue/types";
import { createLogger } from "~/lib/observability/logger";
import { openStoredFileStream } from "~/server/files/storage";
import { createNeedsExecutiveOutboxQueue } from "~/server/integrations/queue/integration-outbox-needs-executive-queue";
import { createReadyForQuotationOutboxQueue } from "~/server/integrations/queue/integration-outbox-ready-for-quotation-queue";
import { createLeadsImportQueue } from "~/server/integrations/queue/leads-import-queue";
import { getServerRuntime } from "~/server/runtime";
import { createSalesExportQueue } from "~/server/sales/queue/sales-export-queue";
import { startAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";

const WORKER_ID = `bg-${process.pid}`;
const logger = createLogger("background-jobs", { workerId: WORKER_ID });

export function startBackgroundJobs() {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  const { integration } = getServerRuntime().integrations;

  const leadsImportQueue = createLeadsImportQueue(WORKER_ID, {
    runtime: integration,
    openFileStream: (filePath) =>
      openStoredFileStream(config.uploads.storageRoot, filePath),
  });
  const needsExecutiveOutboxQueue = createNeedsExecutiveOutboxQueue(WORKER_ID, {
    executor: integration.executor,
  });
  const readyForQuotationOutboxQueue = createReadyForQuotationOutboxQueue(
    WORKER_ID,
    {
      executor: integration.executor,
    },
  );
  const salesExportQueue = createSalesExportQueue(WORKER_ID);
  const enrichmentQueue =
    getServerRuntime().clientSearch.createEnrichmentQueue(WORKER_ID);
  const sunatEnrichmentWritebackQueue =
    getServerRuntime().pipeline.createSunatEnrichmentWritebackQueue(WORKER_ID);
  const notificationsEmailQueue =
    getServerRuntime().notifications.createEmailQueue(WORKER_ID);
  const notificationsWhatsAppQueue =
    getServerRuntime().notifications.createWhatsAppQueue(WORKER_ID);
  const queues: QueueRunner[] = [
    leadsImportQueue,
    needsExecutiveOutboxQueue,
    readyForQuotationOutboxQueue,
    salesExportQueue,
    enrichmentQueue,
    sunatEnrichmentWritebackQueue,
    notificationsEmailQueue,
    notificationsWhatsAppQueue,
  ];
  const runAllQueues = () => {
    for (const queue of queues) {
      void queue.runOnce();
    }
  };

  // Start account lifecycle maintenance tasks
  startAccountLifecycleMaintenance({
    executor: getServerRuntime().infra.db,
    messaging: getServerRuntime().notifications.messaging,
    invalidateUserSessions: (userId) =>
      getServerRuntime().auth.sessionService.invalidateUserSessions(userId),
  });

  // Start recovery scanner
  startStaleScanner(30_000);

  // Fallback polling (every 30s)
  setInterval(() => {
    runAllQueues();
  }, 30_000);

  // Redis triggered processing
  void startQueueDoorbellSubscriber({
    LEADS_IMPORT: () => {
      void leadsImportQueue.runOnce();
    },
    INTEGRATION_OUTBOX_NEEDS_EXECUTIVE_INPUT: () => {
      void needsExecutiveOutboxQueue.runOnce();
    },
    INTEGRATION_OUTBOX_READY_FOR_QUOTATION: () => {
      void readyForQuotationOutboxQueue.runOnce();
    },
    SALES_EXPORT: () => {
      void salesExportQueue.runOnce();
    },
    ENRICHMENT: () => {
      void enrichmentQueue.runOnce();
    },
    ENRICHMENT_WRITEBACK: () => {
      void sunatEnrichmentWritebackQueue.runOnce();
    },
    NOTIFICATIONS_EMAIL: () => {
      void notificationsEmailQueue.runOnce();
    },
    NOTIFICATIONS_WHATSAPP: () => {
      void notificationsWhatsAppQueue.runOnce();
    },
  });

  // Initial immediate run
  runAllQueues();
}
