import "server-only";
import type { DomainError } from "~/domain/errors";

import { type ActionDef, createActionRunner } from "./run";
import { defaultPorts } from "./runtime-ports";

// Composition root for server functions. run.ts stays free of concrete
// dependencies so tests can build a runner with fakes.
const serverFunctionRunner = createActionRunner(defaultPorts);

export function executeSessionServerFunction<
  TInput,
  TOutput,
  TError extends DomainError,
>(definition: ActionDef<TInput, TOutput, TError>) {
  return serverFunctionRunner.runAction(definition);
}

export function executeSessionServerFunctionResult<
  TInput,
  TOutput,
  TError extends DomainError,
>(definition: ActionDef<TInput, TOutput, TError>) {
  return serverFunctionRunner.runActionResult(definition);
}

export function executeAdminServerFunction<
  TInput,
  TOutput,
  TError extends DomainError,
>(definition: ActionDef<TInput, TOutput, TError>) {
  return serverFunctionRunner.runAction(definition);
}
