export function buildFileDownloadHeaders(
  mimeType: string,
  safeFilename: string,
  options?: { disposition?: "attachment" | "inline" },
): Record<string, string> {
  const disposition = options?.disposition ?? "attachment";
  const encoded = encodeURIComponent(safeFilename);
  return {
    "content-type": mimeType,
    "content-disposition": `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encoded}`,
    "x-content-type-options": "nosniff",
    "cache-control": "no-store, private",
    pragma: "no-cache",
    "referrer-policy": "no-referrer",
  };
}
