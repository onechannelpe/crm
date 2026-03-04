import { startSessionCleanupScheduler } from "~/lib/auth/session/cleanup";
import { startBackgroundJobs } from "~/lib/background-jobs";
import { migrateToLatest } from "~/lib/db/migrate";

await migrateToLatest();
startSessionCleanupScheduler();
startBackgroundJobs();
