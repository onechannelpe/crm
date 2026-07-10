import { createLogger } from "~/lib/observability/logger";

import { nextAvailableAt } from "./backoff";
import type {
  JobQueueConfig,
  QueueJobBase,
  QueueRunner,
  SettleOutcome,
  Settlement,
} from "./types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function createJobQueue<TJob extends QueueJobBase>(
  config: JobQueueConfig<TJob>,
): QueueRunner {
  const { name, leaseMs, store, workerId, claimFilter, now } = config;
  const maxConcurrency = config.maxConcurrency ?? 1;
  const timeoutMs = config.timeoutMs ?? 120_000;

  let runningCount = 0;
  const logger = createLogger(`queue:${name}`);

  // A retry with no attempts left is demoted to a fail. `attempt_count` was
  // already incremented at claim time, so the row's value reflects the
  // attempt that just ran.
  function resolve(job: TJob, settlement: Settlement): SettleOutcome {
    if (settlement.kind !== "retry") {
      return settlement;
    }
    if (job.attempt_count >= job.max_attempts) {
      return {
        kind: "fail",
        reason: settlement.reason ?? "Max attempts reached",
        patch: settlement.patch,
      };
    }
    return {
      kind: "retry",
      availableAt: nextAvailableAt(job.attempt_count, now()),
      reason: settlement.reason,
      patch: settlement.patch,
    };
  }

  // settle patches queue_state + lease + mirror columns; the handler's `patch`
  // is the only place for extra domain columns.
  function settle(jobId: TJob["id"], outcome: SettleOutcome): Promise<boolean> {
    if (outcome.kind === "done") {
      return store.markDone(jobId, workerId, now(), outcome.patch);
    }
    if (outcome.kind === "retry") {
      return store.scheduleRetry(
        jobId,
        workerId,
        outcome.availableAt,
        outcome.reason ?? null,
        outcome.patch,
      );
    }
    return store.markFailed(
      jobId,
      workerId,
      now(),
      outcome.reason,
      outcome.patch,
    );
  }

  async function renewLease(jobId: TJob["id"], controller: AbortController) {
    try {
      const ok = await store.extendLease(jobId, workerId, leaseMs, now());
      if (!ok) {
        logger.error("lease_stolen", { jobId });
        controller.abort();
      }
    } catch (error: unknown) {
      logger.error("lease_extension_failed", {
        jobId,
        error: errorMessage(error),
      });
      controller.abort();
    }
  }

  async function process(job: TJob) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const renewalInterval = setInterval(() => {
      void renewLease(job.id, controller);
    }, leaseMs / 2);

    try {
      let settlement: Settlement;
      try {
        settlement = await config.handle(job, controller.signal);
        if (controller.signal.aborted) {
          throw new Error("Job aborted after processing");
        }
      } catch (error: unknown) {
        const aborted = controller.signal.aborted;
        const reason = aborted
          ? "Timeout or lease stolen"
          : errorMessage(error);
        logger.error(aborted ? "job_timeout_or_stolen" : "job_failed", {
          jobId: job.id,
          error: reason,
        });
        settlement = { kind: "retry", reason };
      }

      const outcome = resolve(job, settlement);
      await settle(job.id, outcome);
      if (config.onSettled) {
        await config.onSettled(job, outcome);
      }
      if (outcome.kind === "done") {
        logger.info("job_completed", { jobId: job.id });
      }
    } catch (error: unknown) {
      logger.error("settle_failed", {
        jobId: job.id,
        error: errorMessage(error),
      });
    } finally {
      clearTimeout(timeoutId);
      clearInterval(renewalInterval);
      runningCount--;
    }
  }

  async function runOnce() {
    const availableSlots = maxConcurrency - runningCount;
    if (availableSlots <= 0) {
      return;
    }

    try {
      const jobs = await store.claim(
        workerId,
        now(),
        availableSlots,
        leaseMs,
        claimFilter,
      );
      if (jobs.length === 0) {
        return;
      }

      // Reserve at claim time, not after the callback: overlapping runOnce
      // calls (doorbell, poll, self-reschedule) would all read a stale count
      // otherwise. Each job releases its own slot in its finally.
      runningCount += jobs.length;

      await Promise.all(jobs.map((job) => process(job)));

      // A full claim means more work may be waiting; drain again without
      // waiting for the next wake.
      if (jobs.length >= availableSlots) {
        setTimeout(() => {
          void runOnce();
        }, 0);
      }
    } catch (error: unknown) {
      logger.error("claim_failed", { error: errorMessage(error) });
    }
  }

  return { name, runOnce };
}
