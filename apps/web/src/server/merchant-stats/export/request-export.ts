import type { BookFilter } from "~/contracts/merchant-stats/views";
import type { FileRepos } from "~/server/files/service/contracts";
import { issueDownloadToken } from "~/server/files/service/issue-download-token";
import { storeGeneratedFile } from "~/server/files/service/store-generated-file";
import type { FileStorage } from "~/server/files/storage";
import type { AppContext } from "~/server/platform/action/context";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import { getCohortRows } from "../read/cohort";
import { buildMerchantGpvWorkbook } from "./workbook";

type ExportDeps = {
  db: DatabaseExecutor;
  filesRepo: FileRepos;
  filesStorage: FileStorage;
};

export async function requestMerchantGpvExport(
  ctx: AppContext,
  filter: BookFilter,
  deps: ExportDeps,
): Promise<Result<{ token: string }, DomainError>> {
  const [rows, cutAt] = await Promise.all([
    getCohortRows(deps.db, filter),
    latestCompletedReportCut(deps.db),
  ]);
  const bytes = buildMerchantGpvWorkbook(rows);
  const storedFile = await storeGeneratedFile(
    ctx,
    {
      purpose: "merchant_gpv_export",
      filename: exportFilename(cutAt ?? ctx.now()),
      bytes,
    },
    { repo: deps.filesRepo, storage: deps.filesStorage },
  );

  if (!storedFile.ok) return storedFile;

  return issueDownloadToken(ctx, storedFile.value.id, { repo: deps.filesRepo });
}

async function latestCompletedReportCut(
  db: DatabaseExecutor,
): Promise<Date | null> {
  const report = await db
    .selectFrom("merchant_reports as r")
    .innerJoin("merchant_report_imports as i", "i.report_id", "r.id")
    .where("i.queue_state", "=", "done")
    .select("r.cut_at")
    .orderBy("r.cut_at", "desc")
    .executeTakeFirst();

  return report?.cut_at ?? null;
}

function exportFilename(cutAt: Date): string {
  const day = String(cutAt.getUTCDate()).padStart(2, "0");
  const month = String(cutAt.getUTCMonth() + 1).padStart(2, "0");
  const year = cutAt.getUTCFullYear();
  return `GPV AL ${day}-${month}-${year}.xlsx`;
}
