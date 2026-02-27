import { searchEnrichmentService } from "~/server/shared/context";

const runOnce = process.argv.includes("--once");

const BATCH_SIZE = 20;
const LEASE_MS = 30_000;
const LOOP_INTERVAL_MS = 2_000;
const WORKER_ID = `search-enrichment-worker-${process.pid}`;

async function runBatch() {
  const processed = await searchEnrichmentService.runBatch(
    BATCH_SIZE,
    LEASE_MS,
    WORKER_ID,
  );
  if (processed > 0) {
    console.log(`[Search enrichment jobs] Processed ${processed} job(s)`);
  }
}

if (runOnce) {
  await runBatch();
  process.exit(0);
}

let stopped = false;
let inFlight = false;

const loop = async () => {
  if (stopped) return;
  if (inFlight) {
    setTimeout(() => {
      void loop();
    }, LOOP_INTERVAL_MS);
    return;
  }

  inFlight = true;
  try {
    await runBatch();
  } catch (error) {
    console.error("[Search enrichment jobs] Batch failed", error);
  } finally {
    inFlight = false;
    if (!stopped) {
      setTimeout(() => {
        void loop();
      }, LOOP_INTERVAL_MS);
    }
  }
};

void loop();
console.log(
  `[Search enrichment jobs] Worker running every ${LOOP_INTERVAL_MS} ms`,
);

function shutdown() {
  stopped = true;
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
