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
import { getGpvSnapshotDetail } from "~/server/merchant-stats/read/snapshot-detail";
import { buildGpvSnapshotProgressEvent } from "~/server/merchant-stats/snapshot/progress";
import { createGpvSnapshotJobRepo } from "~/server/merchant-stats/snapshot/repo";
import { resolveGpvSnapshotIssue } from "~/server/merchant-stats/snapshot/resolve-issue";
import { submitGpvSnapshot } from "~/server/merchant-stats/snapshot/submit";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getServerRuntime } from "~/server/platform/container";
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
  return runAction({
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
      const submitted = await submitGpvSnapshot(
        {
          file: {
            name: file.name,
            sizeBytes: file.size,
            stream: file.stream(),
          },
          cutAt,
          uploadedBy: ctx.actor.userId,
          now: ctx.now(),
        },
        {
          db: runtime.infra.db,
          files: {
            repo: runtime.files.repo,
            storage: runtime.files.storage,
          },
        },
      );
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
        return Err(fail("import_job_not_found"));
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
    execute: async (_ctx, { snapshotId }) =>
      getGpvSnapshotDetail(getServerRuntime().infra.db, snapshotId),
  });
}

export async function resolveGpvImportIssue(raw: {
  issueId: string;
  resolution: GpvSnapshotIssueResolution;
}) {
  return runAction({
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
}
