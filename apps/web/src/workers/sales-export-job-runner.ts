import { salesExportService } from "~/server/shared/context";

const runOnce = process.argv.includes("--once");

const BATCH_SIZE = 25;
const LOOP_INTERVAL_MS = 1_000;

async function runBatch() {
  const processed = await salesExportService.runBatch(BATCH_SIZE);
  if (processed > 0) {
    console.log(`[Sales export jobs] Processed ${processed} job(s)`);
  }
}

if (runOnce) {
  await runBatch();
  process.exit(0);
}

let stopped = false;
let inFlight = false;

const loop = async () => {
  if (stopped) {
    return;
  }
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
    console.error("[Sales export jobs] Batch failed", error);
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
console.log(`[Sales export jobs] Worker running every ${LOOP_INTERVAL_MS} ms`);

function shutdown() {
  stopped = true;
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
