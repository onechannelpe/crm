import { createLogger } from "~/lib/observability/logger";
import {
  salesExportService,
  searchEnrichmentService,
} from "~/server/shared/context";

const WORKER_ID = `bg-${process.pid}`;
const logger = createLogger("background-jobs", { workerId: WORKER_ID });

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
  ];

  const shutdown = () => stops.forEach((stop) => stop());
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
