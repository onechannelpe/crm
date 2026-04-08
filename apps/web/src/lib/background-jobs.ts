import { startStaleScanner } from "~/lib/job-queue/stale-scanner";
import type { QueueRunner } from "~/lib/job-queue/types";
import { createLogger } from "~/lib/observability/logger";
import { startJobSubscriber } from "~/lib/redis/subscriber";
import { createEnrichmentQueue } from "~/server/client-search/queue/enrichment-queue";
import { createCrmExportQueue } from "~/server/integrations/queue/crm-export-queue";
import { createCrmImportQueue } from "~/server/integrations/queue/crm-import-queue";
import { createNeedsExecutiveOutboxQueue } from "~/server/integrations/queue/integration-outbox-needs-executive-queue";
import { createReadyForQuotationOutboxQueue } from "~/server/integrations/queue/integration-outbox-ready-for-quotation-queue";
import { createSalesExportQueue } from "~/server/sales/queue/sales-export-queue";
import { startAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";

const WORKER_ID = `bg-${process.pid}`;
const logger = createLogger("background-jobs", { workerId: WORKER_ID });

export function startBackgroundJobs() {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  const crmExportQueue = createCrmExportQueue(WORKER_ID);
  const crmImportQueue = createCrmImportQueue(WORKER_ID);
  const needsExecutiveOutboxQueue = createNeedsExecutiveOutboxQueue(WORKER_ID);
  const readyForQuotationOutboxQueue =
    createReadyForQuotationOutboxQueue(WORKER_ID);
  const salesExportQueue = createSalesExportQueue(WORKER_ID);
  const enrichmentQueue = createEnrichmentQueue(WORKER_ID);
  const queues: QueueRunner[] = [
    crmExportQueue,
    crmImportQueue,
    needsExecutiveOutboxQueue,
    readyForQuotationOutboxQueue,
    salesExportQueue,
    enrichmentQueue,
  ];
  const runAllQueues = () => {
    for (const queue of queues) {
      void queue.runOnce();
    }
  };

  // Start account lifecycle maintenance tasks
  startAccountLifecycleMaintenance();

  // Start recovery scanner
  startStaleScanner(30_000);

  // Fallback polling (every 30s)
  setInterval(() => {
    runAllQueues();
  }, 30_000);

  // Redis triggered processing
  void startJobSubscriber({
    CRM_EXPORT: () => {
      void crmExportQueue.runOnce();
    },
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
  });

  // Initial immediate run
  runAllQueues();
}
