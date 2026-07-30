import { query } from "@solidjs/router";

type GetObservabilitySnapshot =
  (typeof import("~/actions/admin/observability.action"))["getObservabilitySnapshot"];

export const observabilitySnapshotQuery = query(
  async (...args: Parameters<GetObservabilitySnapshot>) => {
    "use server";

    const { getObservabilitySnapshot } =
      await import("~/actions/admin/observability.action");
    return getObservabilitySnapshot(...args);
  },
  "observability.snapshot",
);
