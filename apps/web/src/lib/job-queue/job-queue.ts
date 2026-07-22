import { createLogger } from "~/lib/observability/logger";

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

export function createJobQueue<TJob extends QueueJobBase>(
  config: JobQueueConfig<TJob>,
): QueueRunner {
  const { name, leaseMs, store, workerId, now } = config;
  const maxConcurrency = config.maxConcurrency ?? 1;
  const timeoutMs = config.timeoutMs ?? 120_000;

  let runningCount = 0;

  const logger = createLogger(`queue:${name}`);

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
      claimableAt: nextClaimableAt(job.attempt_count, now()),
      reason: settlement.reason,
      patch: settlement.patch,
    };
  }

  function settle(jobId: TJob["id"], outcome: SettleOutcome): Promise<boolean> {
    if (outcome.kind === "done") {
      return store.markDone(jobId, workerId, now(), outcome.patch);
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
      now(),
      outcome.reason,
      outcome.patch,
    );
  }

  async function renewLease(
    jobId: TJob["id"],
    controller: AbortController,
  ): Promise<void> {
    try {
      const renewed = await store.extendLease(jobId, workerId, leaseMs, now());

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

  async function processJob(job: TJob): Promise<void> {
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

      let settled: boolean;

      try {
        settled = await settle(job.id, outcome);
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
  async function drain(): Promise<void> {
    try {
      for (;;) {
        const availableSlots = maxConcurrency - runningCount;

        if (availableSlots <= 0) {
          return;
        }

        const jobs = await store.claim(
          workerId,
          now(),
          availableSlots,
          leaseMs,
        );

        if (jobs.length === 0) {
          return;
        }

        runningCount += jobs.length;

        await Promise.all(jobs.map((job) => processJob(job)));

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

  return { name, drain };
}
