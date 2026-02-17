import { config } from "~/lib/config";
import type { Repositories } from "~/server/shared/registry";

interface Deps {
  repos: {
    inventory: Pick<Repositories["inventory"], "releaseExpiredLocks">;
  };
  logger?: Pick<Console, "info" | "error">;
  now?: () => number;
}

interface WorkerControl {
  stop: () => void;
}

export function createInventoryMaintenanceService({
  repos,
  logger = console,
  now = () => Date.now(),
}: Deps) {
  return {
    async releaseExpiredLocksOnce(): Promise<number> {
      const released = await repos.inventory.releaseExpiredLocks(now());
      if (released > 0) {
        logger.info(`[Inventory cleanup] Released ${released} expired locks`);
      }
      return released;
    },

    startWorker(
      intervalMs: number = config.inventoryLock.cleanupIntervalMs,
    ): WorkerControl {
      if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
        throw new Error("inventory cleanup interval must be a positive number");
      }

      let active = false;
      const run = async () => {
        if (active) return;
        active = true;
        try {
          await this.releaseExpiredLocksOnce();
        } catch (error) {
          logger.error("[Inventory cleanup] Worker tick failed", error);
        } finally {
          active = false;
        }
      };

      const timer = setInterval(() => {
        void run();
      }, intervalMs);

      return {
        stop() {
          clearInterval(timer);
        },
      };
    },
  };
}
