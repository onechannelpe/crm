import type { Selectable } from "kysely";

import type { MerchantAttributionJobsTable } from "~/lib/db/schema/modules/merchant-stats.types";
import { createJobQueue } from "~/lib/job-queue/job-queue";
import { createJobStore } from "~/lib/job-queue/job-store";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { MerchantAttributionJobId } from "~/server/shared/ids";

import { recomputeAttribution } from "./recompute";

type MerchantAttributionJobRow = Selectable<MerchantAttributionJobsTable>;

const JOB_COLUMNS = [
  "id",
  "ruc",
  "month",
  "queue_state",
  "error_message",
  "lease_owner",
  "attempt_count",
  "max_attempts",
  "claimable_at",
  "created_at",
  "completed_at",
] as const;

interface MerchantAttributionQueueDeps {
  db: DatabaseExecutor;
  now: () => Date;
}

export function createMerchantAttributionQueue(
  workerId: string,
  deps: MerchantAttributionQueueDeps,
) {
  const store = createJobStore<
    MerchantAttributionJobRow,
    MerchantAttributionJobId
  >(deps.db, "merchant_attribution_jobs", JOB_COLUMNS);

  return createJobQueue<MerchantAttributionJobRow>({
    name: "merchant-attribution",
    leaseMs: 30_000,
    maxConcurrency: 4,
    now: deps.now,
    workerId,
    store,
    handle: async (job) => {
      await recomputeAttribution(
        deps.db,
        [{ ruc: job.ruc, month: job.month }],
        deps.now(),
      );

      return { kind: "done" };
    },
  });
}
