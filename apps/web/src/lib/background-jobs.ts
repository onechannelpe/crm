import { dbUrl } from "~/lib/db/db";
import { createPgListener, type PgListenerHandler } from "~/lib/db/notify";
import { uploadsConfig } from "~/lib/env";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type { QueueRunner } from "~/lib/job-queue/types";
import { createLogger } from "~/lib/observability/logger";
import { readStoredFile } from "~/server/files/storage";
import { createRecordsImportQueue } from "~/server/integrations/queue/records-import-queue";
import { createMerchantReportsQueue } from "~/server/merchant-stats/queue/merchant-reports-queue";
import { getServerRuntime } from "~/server/platform/container";
import { startAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";
import { startLeadReservationMaintenance } from "~/server/workflow/maintenance/lead-reservation-maintenance";

const WORKER_ID = `bg-${process.pid}`;
const POLL_FLOOR_MS = 1_000; // LISTEN/NOTIFY failures are recovered by polling within this interval.

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

      // Collapse every wake received during the drain into one more drain.
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

const readFile = (filePath: string) =>
  readStoredFile(uploadsConfig().storageRoot, filePath);

export function startBackgroundJobs(): void {
  logger.info("background_jobs_initializing", { workerId: WORKER_ID });

  const runtime = getServerRuntime();
  const { integration } = runtime.integrations;

  const recordsImportQueue = createRecordsImportQueue(WORKER_ID, {
    runtime: integration,
    readFile,
  });

  const merchantReportsQueue = createMerchantReportsQueue(WORKER_ID, {
    db: integration.executor,
    now: integration.now,
    readFile,
  });

  const enrichmentQueue = runtime.clientSearch.createEnrichmentQueue(WORKER_ID);

  const notificationQueues = runtime.notifications.createQueues(WORKER_ID);

  const queuesByChannel: Record<string, QueueRunner[]> = {
    [JOB_TABLE_CHANNELS.workflow_integration_jobs]: [recordsImportQueue],
    [JOB_TABLE_CHANNELS.merchant_report_imports]: [merchantReportsQueue],
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

  startAccountLifecycleMaintenance({
    executor: runtime.infra.db,
    messaging: runtime.notifications.messaging,
    invalidateUserSessions: (userId) =>
      runtime.auth.sessionService.revokeAllForUser(userId),
  });

  startLeadReservationMaintenance({
    executor: runtime.infra.db,
  });

  setInterval(wakeAll, POLL_FLOOR_MS);

  const listener = createPgListener(dbUrl, channels);

  void listener.start();

  wakeAll();
}
