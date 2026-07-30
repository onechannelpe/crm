import "server-only";
import type { DomainError } from "~/domain/errors";

import { recordActionObservation } from "./record-action-observation";
import { type ActionDef, createServerFunctionExecutor } from "./run";

const serverFunctionExecutor = createServerFunctionExecutor({
  now: () => new Date(),
  record: (row) => {
    void recordActionObservation(row).catch(() => {});
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
