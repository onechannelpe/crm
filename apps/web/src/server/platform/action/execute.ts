import "server-only";
import { captureException } from "@sentry/bun";

import type { DomainError } from "~/domain/errors";
import { faultMeta } from "~/shared/observability/fault-meta";
import { createLogger } from "~/shared/observability/runtime-logger";

import { recordActionObservation } from "./record-action-observation";
import { type ActionDef, createServerFunctionExecutor } from "./run";

const logger = createLogger("action-fault");

const serverFunctionExecutor = createServerFunctionExecutor({
  now: () => new Date(),
  record: (row) => {
    void recordActionObservation(row).catch(() => {});
  },
  report: (error) => {
    logger.error("action_fault", faultMeta(error));
    captureException(error);
  },
});

export function executeSessionServerFunction<
  TInput,
  TOutput,
  TError extends DomainError,
>(definition: ActionDef<TInput, TOutput, TError>) {
  return serverFunctionExecutor.execute(definition);
}

export function executeAdminServerFunction<
  TInput,
  TOutput,
  TError extends DomainError,
>(definition: ActionDef<TInput, TOutput, TError>) {
  return serverFunctionExecutor.execute(definition);
}
