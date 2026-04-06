import { renderAccountExpiringEmail } from "@crm/notifications";

import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";
import { shortName } from "~/lib/users/display-name";
import { getClientSearchRuntime } from "~/server/client-search/runtime";
import { createExportBatchRunner } from "~/server/integrations/application/run-export-job";
import { createImportBatchRunner } from "~/server/integrations/application/run-import-job";
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
const salesExportService = createSalesExportService(
  {
    reportExportJobs: createReportExportRepo(db),
    salesRecords: createSalesRecordsRepo(db),
  },
  createSalesExportBlobStore(config.uploads.storageRoot),
);
const importService = createImportBatchRunner();
const exportService = createExportBatchRunner();

interface JobLoopConfig {
  name: string;
  intervalMs: number;
  run: () => Promise<void>;
}

function startLoop(loopConfig: JobLoopConfig) {
  let stopped = false;
  let inFlight = false;

  const loop = async () => {
    if (stopped) return;
    if (inFlight) {
      setTimeout(() => void loop(), loopConfig.intervalMs);
      return;
    }

    inFlight = true;
    try {
      await loopConfig.run();
    } catch (error) {
      logger.error("batch_failed", { job: loopConfig.name, error });
    } finally {
      inFlight = false;
      if (!stopped) {
        setTimeout(() => void loop(), loopConfig.intervalMs);
      }
    }
  };

  void loop();
  logger.info("loop_started", {
    job: loopConfig.name,
    intervalMs: loopConfig.intervalMs,
  });

  return () => {
    stopped = true;
  };
}

export function startBackgroundJobs() {
  const stops = [
    startLoop({
      name: "Search enrichment jobs",
      intervalMs: 2_000,
      async run() {
        const processed = await searchEnrichmentService.runBatch(
          20,
          30_000,
          WORKER_ID,
        );
        if (processed > 0) {
          logger.info("search_enrichment_jobs_processed", { processed });
        }
      },
    }),
    startLoop({
      name: "Sales export jobs",
      intervalMs: 1_000,
      async run() {
        const [processed, expired] = await Promise.all([
          salesExportService.runBatch(25, 30_000, WORKER_ID),
          salesExportService.expireCompleted(25),
        ]);
        if (processed > 0) {
          logger.info("sales_export_jobs_processed", { processed });
        }
        if (expired > 0) {
          logger.info("sales_export_jobs_expired", { expired });
        }
      },
    }),
    startLoop({
      name: "CRM import jobs",
      intervalMs: 2_000,
      async run() {
        const processed = await importService.runBatch(10, 30_000, WORKER_ID);
        if (processed > 0) {
          logger.info("pipeline_import_jobs_processed", { processed });
        }
      },
    }),
    startLoop({
      name: "CRM export jobs",
      intervalMs: 2_000,
      async run() {
        const processed = await exportService.runBatch(10, 30_000, WORKER_ID);
        if (processed > 0) {
          logger.info("pipeline_export_jobs_processed", { processed });
        }
      },
    }),
    startLoop({
      name: "Account expiry",
      intervalMs: 60_000,
      async run() {
        const expiredCount = await expireUsersAndInvalidateSessions(Date.now());
        if (expiredCount > 0) {
          logger.info("accounts_expired", { count: expiredCount });
        }
      },
    }),
    startLoop({
      name: "Expiry notifications",
      intervalMs: 24 * 60 * 60_000,
      async run() {
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
          // eslint-disable-next-line no-await-in-loop
          await notificationSender.send({
            channel: "email",
            to: user.email,
            subject: "Tu cuenta en One Channel vence pronto",
            html,
            text,
          });
          // eslint-disable-next-line no-await-in-loop
          await users.markExpiryNotified(user.id, now);
        }
        if (expiringUsers.length > 0) {
          logger.info("expiry_notifications_sent", {
            count: expiringUsers.length,
          });
        }
      },
    }),
  ];

  const shutdown = () => stops.forEach((stop) => stop());
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
