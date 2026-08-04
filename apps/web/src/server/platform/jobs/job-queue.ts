import type { JobContext } from "~/server/platform/operation/context";
import { createLogger } from "~/shared/observability/runtime-logger";

import { nextClaimableAt } from "./backoff";
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

function resolve(
  job: QueueJobBase,
  settlement: Settlement,
  settledAt: Date,
): SettleOutcome {
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
    claimableAt: nextClaimableAt(job.attempt_count, settledAt),
    reason: settlement.reason,
    patch: settlement.patch,
  };
}

export function createJobQueue<TJob extends QueueJobBase>(
  config: JobQueueConfig<TJob>,
): QueueRunner {
  const { name, leaseMs, store, workerId } = config;
  const maxConcurrency = config.maxConcurrency ?? 1;
  const timeoutMs = config.timeoutMs ?? 120_000;

  let runningCount = 0;
  let stopping = false;
  const activeDrains = new Set<Promise<void>>();

  const logger = createLogger(`queue:${name}`);

  function settle(
    jobId: TJob["id"],
    outcome: SettleOutcome,
    settledAt: Date,
  ): Promise<boolean> {
    if (outcome.kind === "done") {
      return store.markDone(jobId, workerId, settledAt, outcome.patch);
    }

    if (outcome.kind === "retry") {
      return store.scheduleRetry(
        jobId,
        workerId,
        outcome.claimableAt,
        outcome.reason ?? null,
        outcome.patch,
      );
    }

    return store.markFailed(
      jobId,
      workerId,
      settledAt,
      outcome.reason,
      outcome.patch,
    );
  }

  async function renewLease(
    jobId: TJob["id"],
    controller: AbortController,
  ): Promise<void> {
    try {
      // Heartbeat tick, not an operation: no caller instant to inherit.
      const renewed = await store.extendLease(
        jobId,
        workerId,
        leaseMs,
        new Date(), // clock-boundary: lease heartbeat
      );

      if (!renewed) {
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

  async function processJob(job: TJob, operationAt: Date): Promise<void> {
    const controller = new AbortController();
    const context: JobContext = {
      operationAt,
      abortSignal: controller.signal,
    };
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const renewalInterval = setInterval(() => {
      void renewLease(job.id, controller);
    }, leaseMs / 2);

    try {
      let settlement: Settlement;

      try {
        settlement = await config.handle(job, context);

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

      // Settling is its own event, not part of the claim: the handler may have
      // been running for minutes, so reusing `claimedAt` here would stamp a
      // completion time in the past and schedule the retry backoff from an
      // instant that has already elapsed. One read for the whole settlement,
      // so the retry schedule and the stored timestamp still agree.
      const settledAt = new Date(); // clock-boundary: job settlement
      const outcome = resolve(job, settlement, settledAt);

      let settled: boolean;

      try {
        settled = await settle(job.id, outcome, settledAt);
      } catch (error: unknown) {
        logger.error("settle_failed", {
          jobId: job.id,
          error: errorMessage(error),
        });

        return;
      }

      if (!settled) {
        logger.error("settle_rejected", { jobId: job.id });
        return;
      }

      if (config.onSettled) {
        try {
          await config.onSettled(job, outcome);
        } catch (error: unknown) {
          // Settlement is committed; reconnecting clients recover from the snapshot.
          logger.error("on_settled_failed", {
            jobId: job.id,
            error: errorMessage(error),
          });
        }
      }

      if (outcome.kind === "done") {
        logger.info("job_completed", { jobId: job.id });
      }
    } finally {
      clearTimeout(timeoutId);
      clearInterval(renewalInterval);
      runningCount--;
    }
  }

  // Wait for each batch to settle before claiming more jobs.
  /* eslint-disable no-await-in-loop */
  async function drainUntilIdle(): Promise<void> {
    try {
      for (;;) {
        if (stopping) {
          return;
        }

        const availableSlots = maxConcurrency - runningCount;

        if (availableSlots <= 0) {
          return;
        }

        // The inbound event for this batch. Every job in it, and everything
        // those handlers write, inherits this instant.
        const claimedAt = new Date(); // clock-boundary: job claim batch
        const jobs = await store.claim(
          workerId,
          claimedAt,
          availableSlots,
          leaseMs,
        );

        if (jobs.length === 0) {
          return;
        }

        runningCount += jobs.length;

        await Promise.all(jobs.map((job) => processJob(job, claimedAt)));

        if (stopping) {
          return;
        }

        if (jobs.length < availableSlots) {
          return;
        }
      }
    } catch (error: unknown) {
      logger.error("claim_failed", {
        error: errorMessage(error),
      });
    }
  }
  /* eslint-enable no-await-in-loop */

  function drain(): Promise<void> {
    if (stopping) {
      return Promise.resolve();
    }

    const work = drainUntilIdle();
    activeDrains.add(work);
    void work.finally(() => activeDrains.delete(work));
    return work;
  }

  async function stop(): Promise<void> {
    stopping = true;
    await Promise.all(activeDrains);
  }

  return { name, drain, stop };
}
