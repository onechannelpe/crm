"use server";

import type {
  GpvSnapshotProgressEvent,
  GpvSnapshotView,
} from "~/contracts/merchant-stats/imports";
import { fail, type DomainError } from "~/domain/errors";
import {
  GpvSnapshotId,
  GpvSnapshotIssueId,
  GpvSnapshotJobId,
} from "~/domain/ids";
import type { GpvSnapshotIssueResolution } from "~/domain/merchant-stats/snapshot";
import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
import {
  cutAtFromFilename,
  cutAtFromInput,
} from "~/server/merchant-stats/intake/cut-at";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getMerchantStatsRuntime } from "~/server/platform/container/merchant-stats-runtime";
import { Err, Ok, type Result } from "~/shared/result";

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
  return executeSessionServerFunction({
    name: "merchantStats.import.upload",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () => parseUpload(formData),

    audit: ({ file, cutAt }) => ({
      fileName: file.name,
      fileSize: file.size,
      cutAt: cutAt.toISOString(),
    }),

    execute: async (ctx, { file, cutAt }) => {
      const submitted = await getMerchantStatsRuntime().imports.submit({
        file: {
          name: file.name,
          sizeBytes: file.size,
          stream: file.stream(),
        },
        cutAt,
        uploadedBy: ctx.actor.userId,
        now: ctx.now(),
      });
      if (!submitted.ok) return submitted;

      return Ok({
        snapshotId: submitted.value.snapshotId,
        jobId: submitted.value.jobId,
        cutAt: submitted.value.cutAt.toISOString(),
        duplicate: submitted.value.duplicate,
      });
    },
  });
}

// Used when the progress stream is unavailable.
export async function getGpvSnapshotProgress(
  rawJobId: string,
): Promise<GpvSnapshotProgressEvent> {
  return executeSessionServerFunction({
    name: "merchantStats.import.progress",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject({ jobId: rawJobId }, validationFail, (r) => ({
        jobId: r.id("jobId", GpvSnapshotJobId),
      })),

    audit: ({ jobId }) => ({ jobId }),

    execute: async (_ctx, { jobId }) => {
      const progress = await getMerchantStatsRuntime().imports.progress(jobId);

      if (!progress) {
        return Err(fail("import_job_not_found"));
      }

      return Ok(progress);
    },
  });
}

export async function getGpvSnapshot(
  rawSnapshotId: string,
): Promise<GpvSnapshotView> {
  return executeSessionServerFunction({
    name: "merchantStats.import.read",
    access: { kind: "permission", permission: "dashboards:manage" },
    parse: () =>
      parseObject({ snapshotId: rawSnapshotId }, validationFail, (r) => ({
        snapshotId: r.id("snapshotId", GpvSnapshotId),
      })),
    audit: ({ snapshotId }) => ({ snapshotId }),
    execute: async (_ctx, { snapshotId }) =>
      getMerchantStatsRuntime().imports.snapshot(snapshotId),
  });
}

export async function resolveGpvImportIssue(raw: {
  issueId: string;
  resolution: GpvSnapshotIssueResolution;
}) {
  return executeSessionServerFunction({
    name: "merchantStats.import.issue.resolve",
    access: { kind: "permission", permission: "dashboards:manage" },
    parse: () =>
      parseObject(raw, validationFail, (r) => ({
        issueId: r.id("issueId", GpvSnapshotIssueId),
        resolution: r.enum("resolution", SNAPSHOT_RESOLUTIONS),
      })),
    audit: ({ issueId, resolution }) => ({ issueId, resolution }),
    execute: async ({ actor }, input) =>
      getMerchantStatsRuntime().imports.resolveIssue({
        issueId: input.issueId,
        resolution: input.resolution,
        resolvedBy: actor.userId,
      }),
  });
}
