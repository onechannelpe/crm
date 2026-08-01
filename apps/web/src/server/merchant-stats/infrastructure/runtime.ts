import type { GpvSnapshotProgressEvent } from "~/contracts/merchant-stats/imports";
import type {
  BookFilter,
  CohortSaleRow,
  FilterOptions,
  GpvCulqiView,
  GpvPerformanceView,
  Page,
  PublishedPage,
  QualityRow,
} from "~/contracts/merchant-stats/views";
import type { QualityIssue } from "~/contracts/merchant-stats/vocabulary";
import type { DomainError } from "~/domain/errors";
import type {
  GpvSnapshotId,
  GpvSnapshotIssueId,
  GpvSnapshotJobId,
  UserId,
} from "~/domain/ids";
import type { GpvSnapshotIssueResolution } from "~/domain/merchant-stats/snapshot";
import type {
  FileOperationContext,
  FileRepos,
} from "~/server/files/service/contracts";
import type { FileStorage } from "~/server/files/storage";
import { createGpvSnapshotQueue } from "~/server/merchant-stats/snapshot/queue";
import { createGpvSnapshotJobRepo } from "~/server/merchant-stats/snapshot/repo";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Result } from "~/shared/result";

import { setTarget, type SetTargetInput } from "../commands/set-target";
import {
  adjustMerchantMonthCredit,
  type AdjustMerchantMonthCreditInput,
} from "../credit/adjust";
import { requestMerchantGpvExport } from "../export/request-export";
import { getCohortRows } from "../read/cohort";
import {
  getGpvCulqiView,
  getGpvPerformanceView,
} from "../read/dashboard-views";
import { loadExecutiveGpvProgress } from "../read/executive-portfolio";
import { getFilterOptions } from "../read/options";
import { readPublishedGpvPage } from "../read/published-page";
import { getQualityRows } from "../read/quality";
import { getMerchantStatsForViewer } from "../read/ruc-stats";
import { getGpvSnapshotDetail } from "../read/snapshot-detail";
import { buildGpvSnapshotProgressEvent } from "../snapshot/progress";
import { resolveGpvSnapshotIssue } from "../snapshot/resolve-issue";
import { submitGpvSnapshot } from "../snapshot/submit";

interface MerchantStatsRuntimeDeps {
  db: DatabaseExecutor;
  files: {
    repo: FileRepos;
    storage: FileStorage;
  };
}

export function createMerchantStatsRuntime(deps: MerchantStatsRuntimeDeps) {
  const jobs = createGpvSnapshotJobRepo(deps.db);

  return {
    dashboard: {
      performance: (
        filter: BookFilter,
        now: Date,
      ): Promise<GpvPerformanceView> =>
        getGpvPerformanceView(deps.db, filter, now),
      culqi: (filter: BookFilter): Promise<GpvCulqiView> =>
        getGpvCulqiView(deps.db, filter),
      cohorts: (
        filter: BookFilter,
        page: Page,
      ): Promise<PublishedPage<CohortSaleRow>> =>
        readPublishedGpvPage(deps.db, (transaction) =>
          getCohortRows(transaction, filter, page),
        ),
      filterOptions: (): Promise<FilterOptions> => getFilterOptions(deps.db),
      export: (ctx: FileOperationContext, filter: BookFilter) =>
        requestMerchantGpvExport(ctx, filter, {
          db: deps.db,
          filesRepo: deps.files.repo,
          filesStorage: deps.files.storage,
        }),
    },
    executive: {
      progress: (userId: UserId, now: Date) =>
        loadExecutiveGpvProgress(deps.db, userId, now),
      rucStats: getMerchantStatsForViewer.bind(null, deps.db),
    },
    quality: {
      rows: (
        issue: QualityIssue,
        page: Page,
      ): Promise<PublishedPage<QualityRow>> =>
        readPublishedGpvPage(deps.db, (transaction) =>
          getQualityRows(transaction, issue, page),
        ),
    },
    attribution: {
      adjust: (
        input: Omit<AdjustMerchantMonthCreditInput, "now">,
        now: Date,
      ): Promise<Result<void, DomainError>> =>
        adjustMerchantMonthCredit(deps.db, { ...input, now }),
      setTarget: (
        input: Omit<SetTargetInput, "now">,
        now: Date,
      ): Promise<Result<void, DomainError>> =>
        setTarget(deps.db, { ...input, now }),
    },
    imports: {
      submit: (input: Parameters<typeof submitGpvSnapshot>[0]) =>
        submitGpvSnapshot(input, { db: deps.db, files: deps.files }),
      progress: async (
        jobId: GpvSnapshotJobId,
      ): Promise<GpvSnapshotProgressEvent | null> => {
        const job = await jobs.findById(jobId);
        return job ? buildGpvSnapshotProgressEvent(job) : null;
      },
      snapshot: (snapshotId: GpvSnapshotId) =>
        getGpvSnapshotDetail(deps.db, snapshotId),
      resolveIssue: (
        input: {
          issueId: GpvSnapshotIssueId;
          resolution: GpvSnapshotIssueResolution;
          resolvedBy: UserId;
        },
        now: Date,
      ) => resolveGpvSnapshotIssue(deps.db, { ...input, now }),
      createQueue: (workerId: string) =>
        createGpvSnapshotQueue(workerId, {
          db: deps.db,
          readFile: (storageKey) => deps.files.storage.getBytes(storageKey),
        }),
    },
  };
}
