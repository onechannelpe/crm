import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { Err, Ok, type Result } from "~/server/shared/result";

export type AppUow<TTx> = {
  run<T, E>(work: (tx: TTx) => Promise<Result<T, E>>): Promise<Result<T, E>>;
};

const RESULT_ROLLBACK = Symbol("result_rollback");

export async function runResultTransaction<TTx, T, E>(
  run: (work: (tx: TTx) => Promise<T>) => Promise<T>,
  work: (tx: TTx) => Promise<Result<T, E>>,
): Promise<Result<T, E>> {
  let rollback: Result<never, E> | null = null;
  try {
    const value = await run(async (tx) => {
      const result = await work(tx);
      if (!result.ok) {
        rollback = Err(result.error);
        throw RESULT_ROLLBACK;
      }
      return result.value;
    });
    return Ok(value);
  } catch (error) {
    if (error === RESULT_ROLLBACK && rollback) {
      return rollback;
    }
    throw error;
  }
}

export function createExecutorUow<TTx>(
  executor: DatabaseExecutor,
  bindTx: (txDb: DatabaseExecutor) => TTx,
): AppUow<TTx> {
  return {
    run(work) {
      return runResultTransaction(
        (operation) =>
          executor.transaction().execute((txDb) => operation(bindTx(txDb))),
        work,
      );
    },
  };
}
