import { fail, type DomainError } from "~/domain/errors";
import { GpvSnapshotIssueId } from "~/domain/ids";
import type { GpvSnapshotIssueResolution } from "~/domain/merchant-stats/snapshot";
import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
import {
  cutAtFromFilename,
  cutAtFromInput,
} from "~/server/merchant-stats/intake/cut-at";
import { composeMerchantStats } from "~/server/merchant-stats/ui/composition";
import {
  executeSessionServerFunction,
  executeSessionServerFunctionResult,
} from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Err, Ok, type Result } from "~/shared/result";

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
  "use server";

  return executeSessionServerFunctionResult({
    name: "merchantStats.import.upload",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () => parseUpload(formData),

    audit: ({ file, cutAt }) => ({
      fileName: file.name,
      fileSize: file.size,
      cutAt: cutAt.toISOString(),
    }),

    execute: async (context, { file, cutAt }) => {
      const submitted = await composeMerchantStats().imports.submit({
        file: {
          name: file.name,
          sizeBytes: file.size,
          stream: file.stream(),
        },
        cutAt,
        uploadedBy: context.actor.userId,
        now: context.now(),
      });

      if (!submitted.ok) {
        return submitted;
      }

      return Ok({
        snapshotId: submitted.value.snapshotId,
        jobId: submitted.value.jobId,
        cutAt: submitted.value.cutAt.toISOString(),
        duplicate: submitted.value.duplicate,
      });
    },
  });
}

export async function resolveGpvImportIssue(input: {
  issueId: string;
  resolution: GpvSnapshotIssueResolution;
}) {
  "use server";

  return executeSessionServerFunction({
    name: "merchantStats.import.issue.resolve",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        issueId: reader.id("issueId", GpvSnapshotIssueId),
        resolution: reader.enum("resolution", SNAPSHOT_RESOLUTIONS),
      })),

    audit: ({ issueId, resolution }) => ({ issueId, resolution }),

    execute: ({ actor }, { issueId, resolution }) =>
      composeMerchantStats().imports.resolveIssue({
        issueId,
        resolution,
        resolvedBy: actor.userId,
      }),
  });
}
