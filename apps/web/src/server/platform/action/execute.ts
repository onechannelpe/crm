import type { DomainError } from "~/domain/errors";

import { type ActionDef, serverFunctionRunner } from "./run";

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
