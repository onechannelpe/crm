import { createLogger } from "~/lib/observability/logger";

import { nextAvailableAt } from "./backoff";
import type { JobQueueConfig, QueueJobBase, QueueRunner } from "./types";

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

  function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }

  async function renewLease(jobId: number, controller: AbortController) {
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

      await Promise.all(
        jobs.map(async (job) => {
          runningCount++;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const renewalInterval = setInterval(() => {
            void renewLease(job.id, controller);
          }, leaseMs / 2);

          try {
            const result = await config.handle(job, controller.signal);
            await config.onComplete(job.id, result);
            logger.info("job_completed", { jobId: job.id });
          } catch (error: unknown) {
            const reason = errorMessage(error);
            if (controller.signal.aborted) {
              logger.error("job_timeout_or_stolen", { jobId: job.id });
              if (job.attempt_count < job.max_attempts) {
                await config.onRetry(
                  job.id,
                  nextAvailableAt(job.attempt_count),
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
