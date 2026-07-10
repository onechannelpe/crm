import { captureException } from "@sentry/bun";

import { getServerRuntime } from "~/server/platform/container";

import type { TelemetryRow } from "./telemetry";

// Clock, error reporter, and recorder are injected so tests can swap fakes
// without monkey-patching globals.
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
