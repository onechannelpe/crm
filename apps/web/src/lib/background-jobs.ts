import { renderAccountExpiringEmail } from "@crm/notifications";

import { createLogger } from "~/lib/observability/logger";
import { shortName } from "~/lib/users/display-name";
import {
  exportService,
  importService,
  notificationSender,
  repos,
  salesExportService,
  searchEnrichmentService,
} from "~/server/shared/context";

const WORKER_ID = `bg-${process.pid}`;
const logger = createLogger("background-jobs", { workerId: WORKER_ID });

const EXPIRY_NOTIFICATION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

interface JobLoopConfig {
  name: string;
  intervalMs: number;
  run: () => Promise<void>;
}

function startLoop(config: JobLoopConfig) {
  let stopped = false;
  let inFlight = false;

  const loop = async () => {
    if (stopped) return;
    if (inFlight) {
      setTimeout(() => void loop(), config.intervalMs);
      return;
    }

    inFlight = true;
    try {
      await config.run();
    } catch (error) {
      logger.error("batch_failed", { job: config.name, error });
    } finally {
      inFlight = false;
      if (!stopped) {
        setTimeout(() => void loop(), config.intervalMs);
      }
    }
  };

  void loop();
  logger.info("loop_started", {
    job: config.name,
    intervalMs: config.intervalMs,
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
          logger.info("crm_import_jobs_processed", { processed });
        }
      },
    }),
    startLoop({
      name: "CRM export jobs",
      intervalMs: 2_000,
      async run() {
        const processed = await exportService.runBatch(10, 30_000, WORKER_ID);
        if (processed > 0) {
          logger.info("crm_export_jobs_processed", { processed });
        }
      },
    }),
    startLoop({
      name: "Account expiry",
      intervalMs: 60_000,
      async run() {
        const expiredIds = await repos.users.expireActiveUsersBefore(
          Date.now(),
        );
        for (const userId of expiredIds) {
          // eslint-disable-next-line no-await-in-loop
          await repos.sessions.deleteAllForUser(userId);
        }
        if (expiredIds.length > 0) {
          logger.info("accounts_expired", { count: expiredIds.length });
        }
      },
    }),
    startLoop({
      name: "Expiry notifications",
      intervalMs: 24 * 60 * 60_000,
      async run() {
        const threshold = Date.now() + EXPIRY_NOTIFICATION_THRESHOLD_MS;
        const users = await repos.users.findExpiringBefore(threshold);
        const now = Date.now();
        for (const user of users) {
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
          await repos.users.markExpiryNotified(user.id, now);
        }
        if (users.length > 0) {
          logger.info("expiry_notifications_sent", { count: users.length });
        }
      },
    }),
  ];

  const shutdown = () => stops.forEach((stop) => stop());
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
