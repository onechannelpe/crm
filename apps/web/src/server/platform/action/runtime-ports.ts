import "server-only";
import { captureException } from "@sentry/bun";

import { createLogger } from "~/shared/observability/runtime-logger";

import type { RuntimePorts } from "./ports";
import { recordActionObservation } from "./record-action-observation";

const logger = createLogger("action-fault");

// Domain error fields are spread flat because the logger only unwraps Error
// values at the top level of the meta object.
function faultMeta(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { error };

  if (error === null || typeof error !== "object") {
    return { error: String(error) };
  }

  return Object.fromEntries(Object.entries(error));
}

export const defaultPorts: RuntimePorts = {
  now: () => new Date(),

  // Faults that are thrown reach onServerFunctionError with their cause
  // intact. Faults that are returned as Err do not: they are projected to a
  // WireError here and the DomainError, the only thing holding internalMessage
  // and cause, is dropped. This is the one place that still has it.
  report: (error) => {
    logger.error("action_fault", faultMeta(error));
    captureException(error);
  },

  record: (row) => {
    void recordActionObservation(row).catch(() => {});
  },
};
