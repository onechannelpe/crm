import { createLogger } from "~/lib/observability/logger";

import { nextAvailableAt } from "./backoff";

const globalLogger = createLogger("job-queue");

export interface JobQueueConfig<TJob> {
  name: string;
  leaseMs: number;
  maxConcurrency?: number;
  timeoutMs?: number;
  batchSize?: number; // used to detect if full batch was claimed (for re-triggering logic)
  poll(): Promise<TJob[]>;
  handle(job: TJob, signal: AbortSignal): Promise<void>;
  extendLease(jobId: number): Promise<boolean>;
  onComplete(jobId: number): Promise<void>;
  onRetry(jobId: number, availableAt: number): Promise<void>;
  onFail(jobId: number, reason: string): Promise<void>;
}

export function createJobQueue<
  TJob extends { id: number; attempt_count: number; max_attempts: number },
>(config: JobQueueConfig<TJob>) {
  const name = config.name;
  const leaseMs = config.leaseMs;
  const maxConcurrency = config.maxConcurrency ?? 1;
  const timeoutMs = config.timeoutMs ?? 120_000; // 2 minutes default

  let runningCount = 0;
  const logger = createLogger(`queue:${name}`);

  async function runOnce() {
    if (runningCount >= maxConcurrency) {
      return;
    }

    runningCount++;
    try {
      const jobs = await config.poll();
      if (jobs.length === 0) {
        return;
      }

      await Promise.all(
        jobs.map(async (job) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          // Lease renewal timer
          const renewalInterval = setInterval(async () => {
            const ok = await config.extendLease(job.id);
            if (!ok) {
              logger.error("lease_stolen", { jobId: job.id });
              controller.abort();
            }
          }, leaseMs / 2);

          try {
            await config.handle(job, controller.signal);
            await config.onComplete(job.id);
            logger.info("job_completed", { jobId: job.id });
          } catch (err: any) {
            const reason = err.message || "Unknown error";
            if (controller.signal.aborted) {
              logger.error("job_timeout_or_stolen", { jobId: job.id });
              // For timeout/stolen, we usually want to retry unless it exceeded max_attempts
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
          }
        }),
      );

      // If we got a full batch, there might be more jobs waiting
      const batchSize = config.batchSize ?? 1;
      if (jobs.length >= batchSize) {
        setTimeout(() => runOnce(), 0);
      }
    } catch (err: any) {
      logger.error("poll_failed", { error: err.message });
    } finally {
      runningCount--;
    }
  }

  return {
    name,
    runOnce,
  };
}
