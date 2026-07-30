import { captureException } from "@sentry/bun";

import { getObservabilityRuntime } from "~/server/platform/container/observability-runtime";
import { createLogger } from "~/shared/observability/runtime-logger";

import type { TelemetryRow } from "./telemetry";

const logger = createLogger("action-fault");

// Domain error fields are spread flat because the logger only unwraps Error
// values at the top level of the meta object.
function faultMeta(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { error };
  if (error === null || typeof error !== "object") return { error: String(error) };

  return Object.fromEntries(Object.entries(error));
}

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
    logger.error("action_fault", faultMeta(error));
    captureException(error);
  },
  record: (row) => {
    void getObservabilityRuntime()
      .observabilityService.recordAction(row)
      .catch(() => {});
  },
};
