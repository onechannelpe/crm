import { query } from "@solidjs/router";

type GetGpvSnapshot =
  (typeof import("~/actions/merchant-stats/imports.action"))["getGpvSnapshot"];

export const gpvSnapshotQuery = query(
  async (...args: Parameters<GetGpvSnapshot>) => {
    "use server";

    const { getGpvSnapshot } =
      await import("~/actions/merchant-stats/imports.action");
    return getGpvSnapshot(...args);
  },
  "merchant-stats.gpv-snapshot",
);
