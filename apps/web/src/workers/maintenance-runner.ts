import { startMaintenanceWorker } from "~/server/platform/workers/maintenance-worker";

const worker = startMaintenanceWorker();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void worker.stop().finally(() => process.exit(0));
  });
}
