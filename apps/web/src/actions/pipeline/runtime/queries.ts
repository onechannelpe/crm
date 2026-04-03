import type { DatabaseExecutor } from "~/server/shared/db-executor";

export function createPipelineQueryRuntime<TDeps>(
  createDeps: (executor?: DatabaseExecutor) => TDeps,
): TDeps {
  return createDeps();
}
