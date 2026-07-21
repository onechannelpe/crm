"use server";

import { maxUploadBytesForFilePurpose } from "~/server/files/validators";
import { acceptReport } from "~/server/merchant-stats/commands/accept-report";
import { contentSha256 } from "~/server/merchant-stats/intake/content-hash";
import { cutAtFromFilename } from "~/server/merchant-stats/intake/cut-at";
import {
  createMerchantReportImportRepo,
  type MerchantReportImportRow,
} from "~/server/merchant-stats/queue/import-repo";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import {
  fail,
  throwDomain,
  type DomainError,
} from "~/server/shared/domain-error";
import { MerchantReportImportId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface UploadedReport {
  importId: string | null;
  cutAt: string;
  duplicate: boolean;
}

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

  if (file.size > maxUploadBytesForFilePurpose("integration_import")) {
    return Err(fail("file_too_large"));
  }

  const rawCutAt = formData.get("cutAt");
  const cutAt =
    typeof rawCutAt === "string" && rawCutAt.length > 0
      ? new Date(rawCutAt)
      : cutAtFromFilename(file.name);

  if (!cutAt || Number.isNaN(cutAt.getTime())) {
    return Err(fail("gpv_cut_required"));
  }

  return Ok({ file, cutAt });
}

export async function uploadMerchantReport(
  formData: FormData,
): Promise<UploadedReport> {
  return runAction({
    name: "dashboards.import.upload",
    access: { kind: "permission", permission: "dashboards:manage" },

    parse: () => parseUpload(formData),

    audit: ({ file, cutAt }) => ({
      fileName: file.name,
      fileSize: file.size,
      cutAt: cutAt.toISOString(),
    }),

    execute: async ({ actor, now }, { file, cutAt }) => {
      const runtime = getServerRuntime();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sha256 = contentSha256(bytes);
      const storageKey = `gpv-reports/${sha256}.xlsx`;

      await runtime.files.storage.putBytes(storageKey, bytes);

      const acceptance = await acceptReport(runtime.infra.db, {
        contentSha256: sha256,
        cutAt,
        storageKey,
        sourceFilename: file.name,
        uploadedBy: actor.userId,
        now: now(),
      });

      return Ok({
        importId: acceptance.kind === "accepted" ? acceptance.importId : null,
        cutAt: cutAt.toISOString(),
        duplicate: acceptance.kind === "duplicate",
      });
    },
  });
}

export async function getMerchantReportImport(
  rawImportId: string,
): Promise<MerchantReportImportRow> {
  return runAction({
    name: "dashboards.import.get_job",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject({ importId: rawImportId }, validationFail, (r) => ({
        importId: r.id("importId", MerchantReportImportId),
      })),

    audit: ({ importId }) => ({ importId }),

    execute: async (_ctx, { importId }) => {
      const runtime = getServerRuntime();
      const imports = createMerchantReportImportRepo(runtime.infra.db);
      const row = await imports.findById(importId);

      if (!row) {
        throwDomain(fail("import_job_not_found"));
      }

      return Ok(row);
    },
  });
}
