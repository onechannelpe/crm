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

const timer = setInterval(() => {
  void runSweep();
}, config.uploads.retentionSweepIntervalMs);

console.log(
  `[Document retention] Worker running every ${config.uploads.retentionSweepIntervalMs} ms`,
);

function shutdown() {
  clearInterval(timer);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
