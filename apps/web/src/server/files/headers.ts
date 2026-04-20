export function buildFileDownloadHeaders(
  mimeType: string,
  safeFilename: string,
): Record<string, string> {
  const encoded = encodeURIComponent(safeFilename);
  return {
    "content-type": mimeType,
    "content-disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encoded}`,
    "x-content-type-options": "nosniff",
    "cache-control": "no-store, private",
    pragma: "no-cache",
    "referrer-policy": "no-referrer",
  };
}
