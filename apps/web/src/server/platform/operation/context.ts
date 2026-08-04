/**
 * The instant an operation happened.
 *
 * Time enters the system at three inbound edges and nowhere else: an HTTP
 * request arriving (`middleware.ts`), a job batch being claimed
 * (`jobs/job-queue.ts`), and a scheduled tick firing
 * (`entrypoints/worker/maintenance-worker.ts`). Each edge reads the clock once,
 * and everything that operation writes agrees on that instant, so a single
 * operation can never record two different times.
 *
 * The instant rides the object that already represents the operation for a
 * layer. It is not a sibling parameter: a frame that does not read the instant
 * must not name it, because a relay parameter is indistinguishable from a
 * meaningful one at the call site and drifts into synonyms (`at`, then
 * `evaluatedAt`, then `now`, all for the same value). A bare `Date` parameter
 * is justified only where the frame compares against it, does arithmetic on
 * it, or stamps it into a column, and there it is named for that use
 * (`activeAsOf`, `expiresBefore`) rather than for the clock.
 *
 * Layers carry their own context because their other needs differ: a workflow
 * write needs an executor, an HTTP action needs the actor and trace ids, a job
 * needs its abort signal. Each satisfies this contract structurally.
 *
 * Elapsed real time is a different measurement and must not use this instant.
 * Durations come from `performance.now()`, because a wall-clock adjustment
 * mid-operation turns a subtraction into a negative duration.
 */
export interface OperationContext {
  readonly operationAt: Date;
}

/**
 * A job run. `operationAt` is the instant the batch containing this job was
 * claimed, shared by every job in that batch.
 */
export interface JobContext extends OperationContext {
  readonly abortSignal: AbortSignal;
}
