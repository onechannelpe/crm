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
