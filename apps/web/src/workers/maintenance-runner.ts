import { startMaintenanceWorker } from "~/server/entrypoints/worker/maintenance-worker";

const worker = startMaintenanceWorker();
let shutdown: Promise<void> | null = null;

function stopWorker(): Promise<void> {
  shutdown ??= worker.stop();
  return shutdown;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void stopWorker().finally(() => process.exit(0));
  });
}
