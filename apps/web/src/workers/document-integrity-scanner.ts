import { config } from "~/lib/config";
import { salesDocumentService } from "~/server/shared/context";

const runOnce = process.argv.includes("--once");

async function runSweep() {
  const quarantinedCount = await salesDocumentService.runIntegritySweep(
    config.uploads.integrityScanBatchSize,
    null,
  );
  console.log(
    `[Document integrity] Quarantined ${quarantinedCount} document(s) with missing blobs`,
  );
}

if (runOnce) {
  await runSweep();
  process.exit(0);
}

let stopped = false;
let inFlight = false;

const runLoop = async () => {
  if (stopped) {
    return;
  }
  if (inFlight) {
    setTimeout(() => {
      void runLoop();
    }, config.uploads.integrityScanIntervalMs);
    return;
  }

  inFlight = true;
  try {
    await runSweep();
  } catch (error) {
    console.error("[Document integrity] Sweep failed", error);
  } finally {
    inFlight = false;
    if (!stopped) {
      setTimeout(() => {
        void runLoop();
      }, config.uploads.integrityScanIntervalMs);
    }
  }
};

void runLoop();

console.log(
  `[Document integrity] Worker running every ${config.uploads.integrityScanIntervalMs} ms`,
);

function shutdown() {
  stopped = true;
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
