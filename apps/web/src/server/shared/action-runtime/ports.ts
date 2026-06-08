import { captureException } from "@sentry/bun";

import { getServerRuntime } from "~/server/runtime";

import type { TelemetryRow } from "./telemetry";

/**
 * The runtime's side-effecting dependencies, injected so the pipeline stays
 * pure and unit tests pass fakes instead of mocking modules. `report` owns the
 * Sentry capture policy; `record` owns the telemetry write; `now` is the single
 * clock for `startedAt` and durations.
 */
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
