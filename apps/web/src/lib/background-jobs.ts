import { startStaleScanner } from "~/lib/job-queue/stale-scanner";
import type { QueueRunner } from "~/lib/job-queue/types";
import { createLogger } from "~/lib/observability/logger";
import { startJobSubscriber } from "~/lib/redis/subscriber";
import { createCrmImportQueue } from "~/server/integrations/queue/crm-import-queue";
import { createNeedsExecutiveOutboxQueue } from "~/server/integrations/queue/integration-outbox-needs-executive-queue";
import { createReadyForQuotationOutboxQueue } from "~/server/integrations/queue/integration-outbox-ready-for-quotation-queue";
import { serverRuntime } from "~/server/runtime";
import { createSalesExportQueue } from "~/server/sales/queue/sales-export-queue";
import { startAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";

const WORKER_ID = `bg-${process.pid}`;
const logger = createLogger("background-jobs", { workerId: WORKER_ID });

export function startBackgroundJobs() {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  const { integration } = serverRuntime.integrations;
  const { storage: fileStorage } = serverRuntime.files;

  const crmImportQueue = createCrmImportQueue(WORKER_ID, {
    runtime: integration,
    blobStore: fileStorage,
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
    serverRuntime.clientSearch.createEnrichmentQueue(WORKER_ID);
  const sunatEnrichmentWritebackQueue =
    serverRuntime.pipeline.createSunatEnrichmentWritebackQueue(WORKER_ID);
  const notificationsEmailQueue =
    serverRuntime.notifications.createEmailQueue(WORKER_ID);
  const notificationsWhatsAppQueue =
    serverRuntime.notifications.createWhatsAppQueue(WORKER_ID);
  const queues: QueueRunner[] = [
    crmImportQueue,
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
    executor: serverRuntime.infra.db,
    messaging: serverRuntime.notifications.messaging,
    invalidateUserSessions: (userId) =>
      serverRuntime.auth.sessionService.invalidateUserSessions(userId),
  });

  // Start recovery scanner
  startStaleScanner(30_000);

  // Fallback polling (every 30s)
  setInterval(() => {
    runAllQueues();
  }, 30_000);

  // Redis triggered processing
  void startJobSubscriber({
    CRM_IMPORT: () => {
      void crmImportQueue.runOnce();
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
