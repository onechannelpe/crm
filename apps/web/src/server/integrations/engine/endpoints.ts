// Engine HTTP endpoints the web client calls.
//
// The server owns these routes (crates/leads/src/api.rs, crates/search/src/api.rs).
// Client route drift is covered by crates/engine/tests/health.rs, which POSTs to
// every route listed here.
export const ENGINE_ENDPOINTS = {
  search: "/search",
  recordCandidates: "/records/candidates",
  recordImports: "/records/imports",
} as const;
