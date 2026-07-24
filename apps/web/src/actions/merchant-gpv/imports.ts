"use server";

import { json } from "@solidjs/router";

import type {
  GpvSnapshotProgressEvent,
  GpvSnapshotView,
} from "~/contracts/merchant-stats/imports";
import { QUERY_KEYS } from "~/contracts/query-keys";
import type { GpvSnapshotIssueResolution } from "~/lib/db/schema/modules/merchant-stats.types";
import { storeUploadedFile } from "~/server/files/service/store-uploaded-file";
import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
import {
  cutAtFromFilename,
  cutAtFromInput,
} from "~/server/merchant-stats/intake/cut-at";
import { acceptGpvSnapshot } from "~/server/merchant-stats/snapshot/accept";
import { buildGpvSnapshotProgressEvent } from "~/server/merchant-stats/snapshot/progress";
import { createGpvSnapshotJobRepo } from "~/server/merchant-stats/snapshot/repo";
import { resolveGpvSnapshotIssue } from "~/server/merchant-stats/snapshot/resolve-issue";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import {
  fail,
  throwDomain,
  type DomainError,
} from "~/server/shared/domain-error";
import {
  GpvSnapshotId,
  GpvSnapshotIssueId,
  GpvSnapshotJobId,
} from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface UploadedReport {
  snapshotId: string;
  jobId: string | null;
  cutAt: string;
  duplicate: boolean;
}

const SNAPSHOT_RESOLUTIONS = [
  "accept_candidate",
  "keep_previous",
  "exclude_candidate",
  "reject_snapshot",
] as const satisfies readonly GpvSnapshotIssueResolution[];

interface Upload {
  file: File;
  cutAt: Date;
}

function parseUpload(formData: FormData): Result<Upload, DomainError> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Err(fail("file_required"));
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return Err(fail("unsupported_file_type"));
  }

  if (file.size > maxUploadBytesForFilePurpose("merchant_gpv_snapshot")) {
    return Err(fail("file_too_large"));
  }

  const rawCutAt = formData.get("cutAt");
  const cutAt =
    typeof rawCutAt === "string" && rawCutAt.length > 0
      ? cutAtFromInput(rawCutAt)
      : cutAtFromFilename(file.name);

  if (!cutAt) {
    return Err(fail("gpv_cut_required"));
  }

  return Ok({ file, cutAt });
}

export async function uploadMerchantReport(formData: FormData) {
  const result = await runAction({
    name: "merchantGpv.import.upload",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () => parseUpload(formData),

    audit: ({ file, cutAt }) => ({
      fileName: file.name,
      fileSize: file.size,
      cutAt: cutAt.toISOString(),
    }),

    execute: async (ctx, { file, cutAt }) => {
      const runtime = getServerRuntime();
      const storedFile = await storeUploadedFile(
        ctx,
        {
          purpose: "merchant_gpv_snapshot",
          name: file.name,
          sizeBytes: file.size,
          stream: file.stream(),
        },
        {
          repo: runtime.files.repo,
          storage: runtime.files.storage,
        },
      );

      if (!storedFile.ok) {
        return storedFile;
      }

      const acceptance = await acceptGpvSnapshot(runtime.infra.db, {
        fileAssetId: storedFile.value.id,
        contentSha256: storedFile.value.sha256Hex,
        cutAt,
        now: ctx.now(),
      });

      if (acceptance.kind === "duplicate") {
        await runtime.files.storage.delete(storedFile.value.storageKey);
        await runtime.infra.db
          .deleteFrom("file_assets")
          .where("id", "=", storedFile.value.id)
          .execute();
      }

      return Ok({
        snapshotId: acceptance.snapshotId,
        jobId: acceptance.kind === "accepted" ? acceptance.jobId : null,
        cutAt: cutAt.toISOString(),
        duplicate: acceptance.kind === "duplicate",
      });
    },
  });

  return json(result, { revalidate: [] });
}

// Used when the progress stream is unavailable.
export async function getGpvSnapshotProgress(
  rawJobId: string,
): Promise<GpvSnapshotProgressEvent> {
  return runAction({
    name: "merchantGpv.import.progress",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject({ jobId: rawJobId }, validationFail, (r) => ({
        jobId: r.id("jobId", GpvSnapshotJobId),
      })),

    audit: ({ jobId }) => ({ jobId }),

    execute: async (_ctx, { jobId }) => {
      const runtime = getServerRuntime();
      const jobs = createGpvSnapshotJobRepo(runtime.infra.db);
      const row = await jobs.findById(jobId);

      if (!row) {
        throwDomain(fail("import_job_not_found"));
      }

      return Ok(buildGpvSnapshotProgressEvent(row));
    },
  });
}

export async function getGpvSnapshot(
  rawSnapshotId: string,
): Promise<GpvSnapshotView> {
  return runAction({
    name: "merchantGpv.import.read",
    access: { kind: "permission", permission: "dashboards:manage" },
    parse: () =>
      parseObject({ snapshotId: rawSnapshotId }, validationFail, (r) => ({
        snapshotId: r.id("snapshotId", GpvSnapshotId),
      })),
    audit: ({ snapshotId }) => ({ snapshotId }),
    execute: async (_ctx, { snapshotId }) => {
      const db = getServerRuntime().infra.db;
      const snapshot = await db
        .selectFrom("gpv_snapshots as snapshot")
        .leftJoin("gpv_snapshot_jobs as job", "job.snapshot_id", "snapshot.id")
        .select([
          "snapshot.id",
          "snapshot.state",
          "snapshot.cut_at",
          "job.id as job_id",
          "job.queue_state",
          "job.rows_applied",
          "job.rows_failed",
          "job.rows_total",
          "job.error_message",
        ])
        .where("snapshot.id", "=", snapshotId)
        .executeTakeFirst();

      if (!snapshot) {
        throwDomain(fail("gpv_snapshot_not_found"));
      }

      const issues = await db
        .selectFrom("gpv_snapshot_issues")
        .select(["id", "issue_type", "detail", "entity_key"])
        .where("snapshot_id", "=", snapshotId)
        .where("severity", "=", "blocking")
        .where("status", "=", "open")
        .orderBy("created_at")
        .execute();

      return Ok({
        snapshotId: snapshot.id,
        state: snapshot.state,
        cutAt: snapshot.cut_at.toISOString(),
        job:
          snapshot.job_id && snapshot.queue_state
            ? {
                type: "gpv_snapshot_progress",
                jobId: snapshot.job_id,
                queueState: snapshot.queue_state,
                rowsApplied: snapshot.rows_applied ?? 0,
                rowsFailed: snapshot.rows_failed ?? 0,
                rowsTotal: snapshot.rows_total ?? 0,
                errorMessage: snapshot.error_message,
              }
            : null,
        issues: issues.map((issue) => ({
          id: issue.id,
          type: issue.issue_type,
          detail: issue.detail,
          entityKey: issue.entity_key,
        })),
      });
    },
  });
}

export async function resolveGpvImportIssue(raw: {
  issueId: string;
  resolution: GpvSnapshotIssueResolution;
}) {
  const result = await runAction({
    name: "merchantGpv.import.issue.resolve",
    access: { kind: "permission", permission: "dashboards:manage" },
    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        issueId: r.id("issueId", GpvSnapshotIssueId),
        resolution: r.enum("resolution", SNAPSHOT_RESOLUTIONS),
      })),
    audit: ({ issueId, resolution }) => ({ issueId, resolution }),
    execute: async ({ actor, now }, input) =>
      resolveGpvSnapshotIssue(getServerRuntime().infra.db, {
        issueId: input.issueId,
        resolution: input.resolution,
        resolvedBy: actor.userId,
        now: now(),
      }),
  });
  const revalidate: string[] = [QUERY_KEYS.merchantGpv.snapshot];

  if (result.activated) {
    revalidate.push(
      QUERY_KEYS.merchantGpv.cohortRows,
      QUERY_KEYS.merchantGpv.culqiView,
      QUERY_KEYS.merchantGpv.performanceView,
      QUERY_KEYS.homeMerchantPortfolio,
      QUERY_KEYS.merchantGpv.filterOptions,
      QUERY_KEYS.merchantGpv.statsByRuc,
      QUERY_KEYS.merchantGpv.qualityRows,
    );
  }

  return json(result, { revalidate });
}
