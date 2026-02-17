import { config } from "~/lib/config";
import { createInventoryMaintenanceService } from "~/server/inventory/maintenance";
import { repos } from "~/server/shared/context";

const service = createInventoryMaintenanceService({ repos });
const runOnce = process.argv.includes("--once");

if (runOnce) {
  await service.releaseExpiredLocksOnce();
  process.exit(0);
}

const worker = service.startWorker(config.inventoryLock.cleanupIntervalMs);
console.log(
  `[Inventory cleanup] Worker running every ${config.inventoryLock.cleanupIntervalMs} ms`,
);

function shutdown() {
  worker.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
