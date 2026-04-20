import { createSignal } from "solid-js";

import type { CommandController, CommandStatus } from "./types";

type CreateCommandControllerOptions<TInput, TOutput> = {
  run: (input: TInput) => Promise<TOutput>;
};

export function createCommandController<TInput, TOutput>(
  options: CreateCommandControllerOptions<TInput, TOutput>,
): CommandController<TInput, TOutput> {
  const [status, setStatus] = createSignal<CommandStatus>("idle");
  const [pending, setPending] = createSignal(false);
  const [lastResult, setLastResult] = createSignal<TOutput | null>(null);
  const [lastError, setLastError] = createSignal<Error | null>(null);
  let inFlight: Promise<TOutput> | null = null;

  async function run(input: TInput): Promise<TOutput> {
    if (inFlight) {
      return inFlight;
    }

    const request = (async () => {
      setPending(true);
      setStatus("running");
      setLastError(null);

      try {
        const result = await options.run(input);
        setLastResult(() => result);
        setStatus("success");
        return result;
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error("Unknown command error");
        setLastError(normalizedError);
        setStatus("error");
        throw normalizedError;
      } finally {
        setPending(false);
        inFlight = null;
      }
    })();

    inFlight = request;
    return request;
  }

  return {
    status,
    pending,
    lastResult,
    lastError,
    run,
  };
}
