// Engine HTTP endpoints the web client calls.
//
// The server owns these routes (crates/leads/src/api.rs, crates/search/src/api.rs).
// This const is the client's view of them; crates/engine/tests/health.rs POSTs to
// every route, so a path drifting from the server fails that integration test.
export const ENGINE_ENDPOINTS = {
  search: "/search",
  recordCandidates: "/records/candidates",
  recordImports: "/records/imports",
} as const;
