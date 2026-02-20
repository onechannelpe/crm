import { config } from "~/lib/config";
import { salesDocumentService } from "~/server/shared/context";

const runOnce = process.argv.includes("--once");

async function runSweep() {
  const deletedCount = await salesDocumentService.runRetentionSweep(null);
  console.log(`[Document retention] Deleted ${deletedCount} document(s)`);
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
    }, config.uploads.retentionSweepIntervalMs);
    return;
  }

  inFlight = true;
  try {
    await runSweep();
  } catch (error) {
    console.error("[Document retention] Sweep failed", error);
  } finally {
    inFlight = false;
    if (!stopped) {
      setTimeout(() => {
        void runLoop();
      }, config.uploads.retentionSweepIntervalMs);
    }
  }
};

void runLoop();

console.log(
  `[Document retention] Worker running every ${config.uploads.retentionSweepIntervalMs} ms`,
);

function shutdown() {
  stopped = true;
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
