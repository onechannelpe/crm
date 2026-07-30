type Composition = typeof import("~/server/merchant-stats/ui/imports");

export async function uploadMerchantReport(
  ...args: Parameters<Composition["uploadMerchantReport"]>
) {
  "use server";
  const { uploadMerchantReport: execute } =
    await import("~/server/merchant-stats/ui/imports");
  return execute(...args);
}

export async function getGpvSnapshotProgress(
  ...args: Parameters<Composition["getGpvSnapshotProgress"]>
) {
  "use server";
  const { getGpvSnapshotProgress: execute } =
    await import("~/server/merchant-stats/ui/imports");
  return execute(...args);
}

export async function getGpvSnapshot(
  ...args: Parameters<Composition["getGpvSnapshot"]>
) {
  "use server";
  const { getGpvSnapshot: execute } =
    await import("~/server/merchant-stats/ui/imports");
  return execute(...args);
}

export async function resolveGpvImportIssue(
  ...args: Parameters<Composition["resolveGpvImportIssue"]>
) {
  "use server";
  const { resolveGpvImportIssue: execute } =
    await import("~/server/merchant-stats/ui/imports");
  return execute(...args);
}
