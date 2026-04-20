import type { Accessor } from "solid-js";

export type PollingState = "idle" | "running" | "stopped" | "timed_out";

export type PollingController = {
  state: Accessor<PollingState>;
  start: () => void;
  stop: () => void;
};

export type CreatePollingControllerOptions = {
  intervalMs: number;
  timeoutMs: number;
  shouldContinue: () => boolean;
  runOnce: () => Promise<void> | void;
  onTimeout?: () => void;
};
