import type { Accessor } from "solid-js";

export type CommandStatus = "idle" | "running" | "success" | "error";

export type CommandController<TInput, TOutput> = {
  status: Accessor<CommandStatus>;
  pending: Accessor<boolean>;
  lastResult: Accessor<TOutput | null>;
  lastError: Accessor<Error | null>;
  run: (input: TInput) => Promise<TOutput>;
};
