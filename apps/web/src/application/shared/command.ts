import type { Result } from "~/domain/shared/result";

export interface Command<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, Error>>;
}
