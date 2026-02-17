import { afterEach, describe, expect, it, vi } from "vitest";

import { createInventoryMaintenanceService } from "~/server/inventory/maintenance";

type InventoryRepos = Parameters<
  typeof createInventoryMaintenanceService
>[0]["repos"];

describe("inventory maintenance service", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("releases expired locks once with injected timestamp", async () => {
    const releaseExpiredLocks: InventoryRepos["inventory"]["releaseExpiredLocks"] =
      vi.fn(async () => 3);
    const logger = { info: vi.fn(), error: vi.fn() };
    const service = createInventoryMaintenanceService({
      repos: {
        inventory: { releaseExpiredLocks },
      },
      logger,
      now: () => 12345,
    });

    const released = await service.releaseExpiredLocksOnce();

    expect(released).toBe(3);
    expect(releaseExpiredLocks).toHaveBeenCalledWith(12345);
    expect(logger.info).toHaveBeenCalledWith(
      "[Inventory cleanup] Released 3 expired locks",
    );
  });

  it("runs cleanup on interval and can be stopped", async () => {
    vi.useFakeTimers();
    const releaseExpiredLocks: InventoryRepos["inventory"]["releaseExpiredLocks"] =
      vi.fn(async () => 0);
    const service = createInventoryMaintenanceService({
      repos: {
        inventory: { releaseExpiredLocks },
      },
    });

    const worker = service.startWorker(1000);
    await vi.advanceTimersByTimeAsync(2500);
    expect(releaseExpiredLocks).toHaveBeenCalledTimes(2);

    worker.stop();
    await vi.advanceTimersByTimeAsync(2000);
    expect(releaseExpiredLocks).toHaveBeenCalledTimes(2);
  });
});
