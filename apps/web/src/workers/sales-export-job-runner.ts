import { migrateToLatest } from "~/lib/db/migrate";
import { salesExportService } from "~/server/shared/context";

await migrateToLatest();

const WORKER_ID = `sales-export-cli-${process.pid}`;
const [processed, expired] = await Promise.all([
  salesExportService.runBatch(25, 30_000, WORKER_ID),
  salesExportService.expireCompleted(25),
]);
console.log(`[Sales export jobs] Processed ${processed}, expired ${expired}`);
