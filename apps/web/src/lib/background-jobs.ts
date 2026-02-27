import {
  salesExportService,
  searchEnrichmentService,
} from "~/server/shared/context";

const WORKER_ID = `bg-${process.pid}`;

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
      console.error(`[${config.name}] Batch failed`, error);
    } finally {
      inFlight = false;
      if (!stopped) {
        setTimeout(() => void loop(), config.intervalMs);
      }
    }
  };

  void loop();
  console.log(`[${config.name}] Running every ${config.intervalMs} ms`);

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
          console.log(`[Search enrichment jobs] Processed ${processed} job(s)`);
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
          console.log(`[Sales export jobs] Processed ${processed} job(s)`);
        }
        if (expired > 0) {
          console.log(`[Sales export jobs] Expired ${expired} job(s)`);
        }
      },
    }),
  ];

  const shutdown = () => stops.forEach((stop) => stop());
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
