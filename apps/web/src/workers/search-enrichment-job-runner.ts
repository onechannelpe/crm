import { migrateToLatest } from "~/lib/db/migrate";
import { searchEnrichmentService } from "~/server/shared/context";

await migrateToLatest();

const WORKER_ID = `search-enrichment-cli-${process.pid}`;
const processed = await searchEnrichmentService.runBatch(20, 30_000, WORKER_ID);
console.log(`[Search enrichment jobs] Processed ${processed} job(s)`);
