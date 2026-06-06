import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export type AppUow<TTx> = {
  run<T>(
    work: (tx: TTx) => Promise<Result<T, DomainError>>,
  ): Promise<Result<T, DomainError>>;
};

class UowRollbackError extends Error {
  constructor(readonly error: DomainError) {
    super(error.message);
  }
}

export async function runResultTransaction<TTx, T>(
  run: (work: (tx: TTx) => Promise<T>) => Promise<T>,
  work: (tx: TTx) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    const value = await run(async (tx) => {
      const result = await work(tx);
      if (!result.ok) {
        throw new UowRollbackError(result.error);
      }
      return result.value;
    });
    return Ok(value);
  } catch (error) {
    if (error instanceof UowRollbackError) {
      return Err(error.error);
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
