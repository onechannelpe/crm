import { startSessionCleanupScheduler } from "~/lib/auth/session/cleanup";
import { startBackgroundJobs } from "~/lib/background-jobs";

startSessionCleanupScheduler();
startBackgroundJobs();
