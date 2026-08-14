// Engine HTTP endpoints the web client calls.
//
// The server owns these routes (crates/leads/src/api.rs, crates/search/src/api.rs,
// crates/engine/src/ingest/api.rs). Client route drift is covered by
// crates/engine/tests/health.rs for the search and record routes, and by
// crates/engine/tests/ingest.rs for the ingest routes.
export const ENGINE_ENDPOINTS = {
  search: "/search",
  recordCandidates: "/records/candidates",
  recordImports: "/records/imports",
  ingestUploads: "/ingest-uploads",
  ingestJobs: "/ingest-jobs",
} as const;

export function ingestUploadBlobPath(uploadId: string): string {
  return `${ENGINE_ENDPOINTS.ingestUploads}/${encodeURIComponent(uploadId)}/blob`;
}

export function ingestJobPath(jobId: string): string {
  return `${ENGINE_ENDPOINTS.ingestJobs}/${encodeURIComponent(jobId)}`;
}
