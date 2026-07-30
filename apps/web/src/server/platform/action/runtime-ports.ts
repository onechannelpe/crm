import "server-only";
import { captureException } from "@sentry/bun";

import { faultMeta } from "~/shared/observability/fault-meta";
import { createLogger } from "~/shared/observability/runtime-logger";

import type { RuntimePorts } from "./ports";
import { recordActionObservation } from "./record-action-observation";

const logger = createLogger("action-fault");

export const defaultPorts: RuntimePorts = {
  now: () => new Date(),

  // Thrown faults reach onServerFunctionError with their cause intact.
  // Returned ones do not: domainToWire projects them to a WireError and drops
  // the DomainError, which is the only thing holding internalMessage and
  // cause. This is the last point that still has it.
  report: (error) => {
    logger.error("action_fault", faultMeta(error));
    captureException(error);
  },

  record: (row) => {
    void recordActionObservation(row).catch(() => {});
  },
};
