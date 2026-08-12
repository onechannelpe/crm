// Shared by the job store and browser without pulling server dependencies into
// the client bundle.
export type QueueState = "pending" | "processing" | "done" | "failed";

const QUEUE_STATES: readonly QueueState[] = [
  "pending",
  "processing",
  "done",
  "failed",
];

export function isQueueState(value: unknown): value is QueueState {
  return QUEUE_STATES.some((state) => state === value);
}
