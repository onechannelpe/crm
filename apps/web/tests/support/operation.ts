import type { OperationContext } from "~/server/platform/operation/context";

export function operationAt(value: Date | number | string): OperationContext {
  return { operationAt: new Date(value) };
}

export const DEFAULT_OPERATION = operationAt("2023-11-14T22:13:20.000Z");
