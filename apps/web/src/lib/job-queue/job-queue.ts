import { createLogger } from "~/lib/observability/logger";

import { nextAvailableAt } from "./backoff";
import type { JobQueueConfig, QueueJobBase, QueueRunner } from "./types";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function createJobQueue<TJob extends QueueJobBase, TResult>(
  config: JobQueueConfig<TJob, TResult>,
): QueueRunner {
  const name = config.name;
  const leaseMs = config.leaseMs;
  const maxConcurrency = config.maxConcurrency ?? 1;
  const timeoutMs = config.timeoutMs ?? 120_000;
  const claimBatchSize = config.batchSize ?? maxConcurrency;

  let runningCount = 0;
  const logger = createLogger(`queue:${name}`);

  async function renewLease(jobId: TJob["id"], controller: AbortController) {
    try {
      const ok = await config.extendLease(jobId);
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

  async function runOnce() {
    const availableSlots = maxConcurrency - runningCount;
    if (availableSlots <= 0) {
      return;
    }

    try {
      const claimLimit = Math.max(1, Math.min(availableSlots, claimBatchSize));
      const jobs = await config.poll(claimLimit);
      if (jobs.length === 0) {
        return;
      }

      // Reserve slots at claim time, not inside the per-job callback. Several
      // runOnce calls can overlap (doorbell wake, periodic drain, the
      // self-reschedule below); incrementing only once the callback ran let
      // them all read a stale count and claim past maxConcurrency. Each job
      // releases its own slot in its finally.
      runningCount += jobs.length;

      await Promise.all(
        jobs.map(async (job) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const renewalInterval = setInterval(() => {
            void renewLease(job.id, controller);
          }, leaseMs / 2);

          try {
            const result = await config.handle(job, controller.signal);
            if (controller.signal.aborted) {
              throw new Error("Job aborted after processing");
            }
            if (config.onResult) {
              const decision = await config.onResult(job, result);
              if (decision.kind === "retry") {
                await config.onRetry(
                  job.id,
                  decision.availableAt,
                  decision.reason,
                );
              } else if (decision.kind === "fail") {
                await config.onFail(job.id, decision.reason);
              } else {
                await config.onComplete(job.id, result);
                logger.info("job_completed", { jobId: job.id });
              }
            } else {
              await config.onComplete(job.id, result);
              logger.info("job_completed", { jobId: job.id });
            }
          } catch (error: unknown) {
            const reason = errorMessage(error);
            if (controller.signal.aborted) {
              logger.error("job_timeout_or_stolen", { jobId: job.id });
              if (job.attempt_count < job.max_attempts) {
                const timeoutReason = "Timeout or lease stolen";
                await config.onRetry(
                  job.id,
                  nextAvailableAt(job.attempt_count),
                  timeoutReason,
                );
              } else {
                await config.onFail(job.id, "Timeout or lease stolen");
              }
            } else {
              logger.error("job_failed", { jobId: job.id, error: reason });
              if (job.attempt_count < job.max_attempts) {
                await config.onRetry(
                  job.id,
                  nextAvailableAt(job.attempt_count),
                  reason,
                );
              } else {
                await config.onFail(job.id, reason);
              }
            }
          } finally {
            clearTimeout(timeoutId);
            clearInterval(renewalInterval);
            runningCount--;
          }
        }),
      );

      if (jobs.length >= claimLimit) {
        setTimeout(() => {
          void runOnce();
        }, 0);
      }
    } catch (error: unknown) {
      logger.error("poll_failed", { error: errorMessage(error) });
    }
  }

  const queue: QueueRunner = {
    name,
    runOnce,
  };
  return queue;
}
