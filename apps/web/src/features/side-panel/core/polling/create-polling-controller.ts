import { createSignal, onCleanup } from "solid-js";

import type {
  CreatePollingControllerOptions,
  PollingController,
  PollingState,
} from "./types";

export function createPollingController(
  options: CreatePollingControllerOptions,
): PollingController {
  const [state, setState] = createSignal<PollingState>("idle");

  // Monotonic reading from `performance.now()`. The timeout measures elapsed
  // time, so a wall-clock adjustment mid-poll must not shorten or extend it.
  let startedTicks: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let runToken = 0;

  function clearScheduledTick() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function stop() {
    runToken += 1;
    clearScheduledTick();
    startedTicks = null;
    setState("stopped");
  }

  async function tick(currentRunToken: number) {
    if (currentRunToken !== runToken) {
      return;
    }
    if (!options.shouldContinue()) {
      stop();
      return;
    }

    if (startedTicks === null) {
      startedTicks = performance.now();
    }

    if (performance.now() - startedTicks >= options.timeoutMs) {
      runToken += 1;
      clearScheduledTick();
      startedTicks = null;
      setState("timed_out");
      options.onTimeout?.();
      return;
    }

    try {
      await options.runOnce();
    } catch {
      // Keep polling on transient failures. The next tick can recover.
    }

    if (currentRunToken !== runToken) {
      return;
    }
    if (!options.shouldContinue()) {
      stop();
      return;
    }

    timeoutId = setTimeout(() => {
      void tick(currentRunToken);
    }, options.intervalMs);
  }

  function start() {
    if (state() === "running") {
      return;
    }

    runToken += 1;
    const currentRunToken = runToken;
    clearScheduledTick();
    startedTicks = performance.now();
    setState("running");

    timeoutId = setTimeout(() => {
      void tick(currentRunToken);
    }, options.intervalMs);
  }

  onCleanup(() => {
    stop();
  });

  return {
    state,
    start,
    stop,
  };
}
