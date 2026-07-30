type Composition = typeof import("~/server/merchant-stats/ui/dashboard");

export async function getGpvPerformance(
  ...args: Parameters<Composition["getGpvPerformance"]>
) {
  "use server";
  const { getGpvPerformance: execute } =
    await import("~/server/merchant-stats/ui/dashboard");
  return execute(...args);
}

export async function getGpvCulqi(
  ...args: Parameters<Composition["getGpvCulqi"]>
) {
  "use server";
  const { getGpvCulqi: execute } =
    await import("~/server/merchant-stats/ui/dashboard");
  return execute(...args);
}

export async function getCohortRows(
  ...args: Parameters<Composition["getCohortRows"]>
) {
  "use server";
  const { getCohortRows: execute } =
    await import("~/server/merchant-stats/ui/dashboard");
  return execute(...args);
}

export async function getFilterOptions(
  ...args: Parameters<Composition["getFilterOptions"]>
) {
  "use server";
  const { getFilterOptions: execute } =
    await import("~/server/merchant-stats/ui/dashboard");
  return execute(...args);
}

export async function requestMerchantGpvExportDownloadToken(
  ...args: Parameters<Composition["requestMerchantGpvExportDownloadToken"]>
) {
  "use server";
  const { requestMerchantGpvExportDownloadToken: execute } =
    await import("~/server/merchant-stats/ui/dashboard");
  return execute(...args);
}
