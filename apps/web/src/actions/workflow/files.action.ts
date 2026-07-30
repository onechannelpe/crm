type Composition = typeof import("~/server/workflow/ui/files");

export async function listLeadSaleProofFiles(
  ...args: Parameters<Composition["listLeadSaleProofFiles"]>
) {
  "use server";
  const { listLeadSaleProofFiles: execute } =
    await import("~/server/workflow/ui/files");
  return execute(...args);
}

export async function requestWorkflowLeadsExportDownloadToken(
  ...args: Parameters<Composition["requestWorkflowLeadsExportDownloadToken"]>
) {
  "use server";
  const { requestWorkflowLeadsExportDownloadToken: execute } =
    await import("~/server/workflow/ui/files");
  return execute(...args);
}

export async function uploadLeadSaleProofFile(
  ...args: Parameters<Composition["uploadLeadSaleProofFile"]>
) {
  "use server";
  const { uploadLeadSaleProofFile: execute } =
    await import("~/server/workflow/ui/files");
  return execute(...args);
}

export async function requestLeadSaleProofDownloadToken(
  ...args: Parameters<Composition["requestLeadSaleProofDownloadToken"]>
) {
  "use server";
  const { requestLeadSaleProofDownloadToken: execute } =
    await import("~/server/workflow/ui/files");
  return execute(...args);
}

export async function uploadLeadRateRevisionFile(
  ...args: Parameters<Composition["uploadLeadRateRevisionFile"]>
) {
  "use server";
  const { uploadLeadRateRevisionFile: execute } =
    await import("~/server/workflow/ui/files");
  return execute(...args);
}

export async function requestRateRevisionFileDownloadToken(
  ...args: Parameters<Composition["requestRateRevisionFileDownloadToken"]>
) {
  "use server";
  const { requestRateRevisionFileDownloadToken: execute } =
    await import("~/server/workflow/ui/files");
  return execute(...args);
}
