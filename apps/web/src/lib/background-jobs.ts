import { dbUrl } from "~/lib/db/db";
import { createPgListener } from "~/lib/db/notify";
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

// A ~1s poll floor backstops the LISTEN/NOTIFY doorbell: even if a wake is lost
// (listener reconnecting, NOTIFY dropped), every queue still drains within a
// second. NOTIFY makes the common path immediate; the floor makes it reliable.
const POLL_FLOOR_MS = 1_000;

// Coalesces a queue's wakeups (NOTIFY bursts plus the poll floor) into at most
// one in-flight `runOnce` with at most one queued behind it. A storm of
// notifications for the same queue collapses into a single fetch, matching
// River's FetchCooldown.
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

  // Each job table's NOTIFY channel maps to the queue that drains it.
  const queueByChannel: Record<string, QueueRunner> = {
    [JOB_TABLE_CHANNELS.workflow_integration_jobs]: recordsImportQueue,
    [JOB_TABLE_CHANNELS.company_registry_record]: enrichmentQueue,
    [JOB_TABLE_CHANNELS.notification_outbox]: notificationQueues.expansion,
    [JOB_TABLE_CHANNELS.notification_deliveries]: notificationQueues.dispatch,
  };

  const wakers = new Map<string, () => void>();
  for (const [channel, queue] of Object.entries(queueByChannel)) {
    wakers.set(
      channel,
      makeWaker(() => queue.runOnce()),
    );
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

  // Poll floor: a light, reliable backstop for any missed NOTIFY.
  setInterval(wakeAll, POLL_FLOOR_MS);

  // Doorbell: wake the matching queue the instant its table receives a NOTIFY.
  const listener = createPgListener(dbUrl);
  for (const channel of Object.keys(queueByChannel)) {
    const wake = wakers.get(channel);
    if (wake) {
      listener.on(channel, wake);
    }
  }
  void listener.start().catch((error: unknown) => {
    logger.error("listener_start_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  });

  wakeAll();
}
