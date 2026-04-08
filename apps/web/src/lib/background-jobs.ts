import { renderAccountExpiringEmail } from "@crm/notifications";

import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { createJobQueue } from "~/lib/job-queue/job-queue";
import { startStaleScanner } from "~/lib/job-queue/stale-scanner";
import { createLogger } from "~/lib/observability/logger";
import { startJobSubscriber } from "~/lib/redis/subscriber";
import { shortName } from "~/lib/users/display-name";
import { getClientSearchRuntime } from "~/server/client-search/runtime";
import { createExportBatchRunner } from "~/server/integrations/application/run-export-job";
import { createImportBatchRunner } from "~/server/integrations/application/run-import-job";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import { getNotificationRuntime } from "~/server/notifications/runtime";
import { createSalesExportBlobStore } from "~/server/sales/export-blob-store";
import { createSalesExportService } from "~/server/sales/export-service";
import { createReportExportRepo } from "~/server/sales/repos-report-exports";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";
import { expireUsersAndInvalidateSessions } from "~/server/users/expire-users";
import { createUsersRepo } from "~/server/users/repos-users";

const WORKER_ID = `bg-${process.pid}`;
const logger = createLogger("background-jobs", { workerId: WORKER_ID });

const EXPIRY_NOTIFICATION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
const users = createUsersRepo(db);
const { notificationSender } = getNotificationRuntime();
const { searchEnrichmentService } = getClientSearchRuntime();
const salesReportExportRepo = createReportExportRepo(db);
const salesExportService = createSalesExportService(
  {
    reportExportJobs: salesReportExportRepo,
    salesRecords: createSalesRecordsRepo(db),
  },
  createSalesExportBlobStore(config.uploads.storageRoot),
);
const importService = createImportBatchRunner();
const exportService = createExportBatchRunner();

/**
 * Legacy loops for account management (not high-volume/latency critical)
 */
function startLegacyIntervals() {
  // Account expiry
  setInterval(async () => {
    try {
      const expiredCount = await expireUsersAndInvalidateSessions(Date.now());
      if (expiredCount > 0) {
        logger.info("accounts_expired", { count: expiredCount });
      }
    } catch (err: any) {
      logger.error("account_expiry_failed", { error: err.message });
    }
  }, 60_000);

  // Expiry notifications
  setInterval(
    async () => {
      try {
        const threshold = Date.now() + EXPIRY_NOTIFICATION_THRESHOLD_MS;
        const expiringUsers = await users.findExpiringBefore(threshold);
        const now = Date.now();
        for (const user of expiringUsers) {
          const { html, text } = renderAccountExpiringEmail({
            fullName: shortName(user),
            username: user.username,
            expiresAt: new Date(user.expires_at!).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          });
          await notificationSender.send({
            channel: "email",
            to: user.email,
            subject: "Tu cuenta en One Channel vence pronto",
            html,
            text,
          });
          await users.markExpiryNotified(user.id, now);
        }
        if (expiringUsers.length > 0) {
          logger.info("expiry_notifications_sent", {
            count: expiringUsers.length,
          });
        }
      } catch (err: any) {
        logger.error("expiry_notifications_failed", { error: err.message });
      }
    },
    24 * 60 * 60_000,
  );
}

export function startBackgroundJobs() {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  // 1. CRM Export Queue
  const crmExportQueue = createJobQueue({
    name: "crm-export",
    leaseMs: 30_000,
    batchSize: 10,
    poll: () => {
      const runtime = createIntegrationRuntime(db);
      return runtime.jobs.claimPending(30_000, WORKER_ID, 10, ["export"]);
    },
    handle: (job, signal: AbortSignal) => exportService.processJob(job, signal),
    extendLease: (id: number) => {
      const runtime = createIntegrationRuntime(db);
      return runtime.jobs.extendLease(id, WORKER_ID, 30_000);
    },
    onComplete: () => Promise.resolve(),
    onRetry: async (id: number, availableAt: number) => {
      const runtime = createIntegrationRuntime(db);
      await runtime.jobs.scheduleRetry(id, availableAt);
    },
    onFail: async (id: number, reason: string) => {
      const runtime = createIntegrationRuntime(db);
      await runtime.jobs.markFailed(id, reason);
    },
  });

  // 2. CRM Import Queue
  const crmImportQueue = createJobQueue({
    name: "crm-import",
    leaseMs: 30_000,
    batchSize: 10,
    poll: () => {
      const runtime = createIntegrationRuntime(db);
      return runtime.jobs.claimPending(30_000, WORKER_ID, 10, [
        "import_status",
        "import_prioridad",
      ]);
    },
    handle: (job, signal: AbortSignal) => importService.processJob(job, signal),
    extendLease: (id: number) => {
      const runtime = createIntegrationRuntime(db);
      return runtime.jobs.extendLease(id, WORKER_ID, 30_000);
    },
    onComplete: () => Promise.resolve(),
    onRetry: async (id: number, availableAt: number) => {
      const runtime = createIntegrationRuntime(db);
      await runtime.jobs.scheduleRetry(id, availableAt);
    },
    onFail: async (id: number, reason: string) => {
      const runtime = createIntegrationRuntime(db);
      await runtime.jobs.markFailed(id, reason);
    },
  });

  // 3. Sales Export Queue
  const salesExportQueue = createJobQueue({
    name: "sales-export",
    leaseMs: 30_000,
    batchSize: 25,
    poll: () =>
      salesExportService.reportExportJobsRepo.leaseQueuedJobs(
        25,
        30_000,
        WORKER_ID,
      ),
    handle: (job, signal: AbortSignal) =>
      salesExportService.processJob(job, WORKER_ID, signal),
    extendLease: (id: number) =>
      salesExportService.reportExportJobsRepo.extendLease(
        id,
        WORKER_ID,
        30_000,
      ),
    onComplete: () => Promise.resolve(),
    onRetry: async (id: number, availableAt: number) => {
      await salesExportService.reportExportJobsRepo.scheduleRetry(
        id,
        availableAt,
      );
    },
    onFail: async (id: number, reason: string) => {
      await salesExportService.reportExportJobsRepo.markJobFailed(
        id,
        WORKER_ID,
        reason,
        Date.now(),
      );
    },
  });

  // 4. Enrichment Queue
  const enrichmentQueue = createJobQueue({
    name: "enrichment",
    leaseMs: 30_000,
    batchSize: 20,
    poll: () =>
      searchEnrichmentService.searchEnrichmentRepo.leaseJobs(
        20,
        30_000,
        WORKER_ID,
      ),
    handle: (job, signal: AbortSignal) =>
      searchEnrichmentService.processJob(job, WORKER_ID, signal),
    extendLease: (id: number) =>
      searchEnrichmentService.searchEnrichmentRepo.extendLease(
        id,
        WORKER_ID,
        30_000,
      ),
    onComplete: () => Promise.resolve(),
    onRetry: async (id: number, availableAt: number) => {
      await searchEnrichmentService.searchEnrichmentRepo.scheduleRetry(
        id,
        availableAt,
      );
    },
    onFail: async (id: number, reason: string) => {
      await searchEnrichmentService.searchEnrichmentRepo.markJobFailed(
        id,
        WORKER_ID,
        reason,
        Date.now(),
      );
    },
  });

  // Start legacy tasks
  startLegacyIntervals();

  // Start recovery scanner
  startStaleScanner(30_000);

  // Fallback Polling (Every 30s)
  setInterval(() => {
    crmExportQueue.runOnce();
    crmImportQueue.runOnce();
    salesExportQueue.runOnce();
    enrichmentQueue.runOnce();
  }, 30_000);

  // Redis Doorbell Triggers
  startJobSubscriber({
    CRM_EXPORT: () => crmExportQueue.runOnce(),
    CRM_IMPORT: () => crmImportQueue.runOnce(),
    SALES_EXPORT: () => salesExportQueue.runOnce(),
    ENRICHMENT: () => enrichmentQueue.runOnce(),
  });

  // Initial immediate run
  crmExportQueue.runOnce();
  crmImportQueue.runOnce();
  salesExportQueue.runOnce();
  enrichmentQueue.runOnce();
}
