import { captureException } from "@sentry/bun";

import { getServerRuntime } from "~/server/platform/container";

import type { TelemetryRow } from "./telemetry";

// Hand every clock, reporter, and recorder through a constructor argument so
// tests can pass fakes.
export type RuntimePorts = {
  now: () => Date;
  report: (error: unknown) => void;
  record: (row: TelemetryRow) => void;
};

export const defaultPorts: RuntimePorts = {
  now: () => new Date(),
  report: (error) => {
    captureException(error);
  },
  record: (row) => {
    void getServerRuntime()
      .observability.observabilityService.recordAction(row)
      .catch(() => {});
  },
};
