import { captureException } from "@sentry/bun";

import { getServerRuntime } from "~/server/platform/container";

import type { TelemetryRow } from "./telemetry";

// Injection isolates side effects and gives tests a deterministic clock.
export type RuntimePorts = {
  now: () => number;
  report: (error: unknown) => void;
  record: (row: TelemetryRow) => void;
};

export const defaultPorts: RuntimePorts = {
  now: Date.now,
  report: (error) => {
    captureException(error);
  },
  record: (row) => {
    void getServerRuntime()
      .observability.observabilityService.recordAction(row)
      .catch(() => {});
  },
};
