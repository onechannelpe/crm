export const ENGINE_ENDPOINTS = {
  search: "/search",
  recordCandidates: "/records/candidates",
  recordImports: "/records/imports",
  ingestUploads: "/ingest-uploads",
  ingestJobs: "/ingest-jobs",
  ingestSources: "/ingest-sources",
} as const;

export function ingestUploadBlobPath(uploadId: string): string {
  return `${ENGINE_ENDPOINTS.ingestUploads}/${encodeURIComponent(uploadId)}/blob`;
}

export function ingestJobPath(jobId: string): string {
  return `${ENGINE_ENDPOINTS.ingestJobs}/${encodeURIComponent(jobId)}`;
}
