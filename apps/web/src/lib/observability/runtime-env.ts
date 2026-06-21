// Isomorphic environment reads for code that genuinely runs in both places:
// the logger and diagnostics, which execute on the server, in CLI scripts, and
// in the browser. Server and CLI processes read process.env; the client reads
// Vite's import.meta.env, where only VITE_-prefixed vars are exposed. Server
// values win when both are present.
//
// This fallback exists only for that dual-runtime case. Server-only code reads
// process.env directly; client-only code uses import.meta.env.DEV / .PROD.

function readImportMetaEnv(): Record<string, unknown> | undefined {
  const metaEnv = (import.meta as { env?: Record<string, unknown> }).env;
  return metaEnv && typeof metaEnv === "object" ? metaEnv : undefined;
}

function readServerEnv(key: string): string | undefined {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return undefined;
  }
  const value = process.env[key];
  return typeof value === "string" ? value : undefined;
}

function readClientEnv(key: string): string | undefined {
  const value = readImportMetaEnv()?.[`VITE_${key}`];
  return typeof value === "string" ? value : undefined;
}

export function readRuntimeEnv(key: string): string | undefined {
  return readServerEnv(key) ?? readClientEnv(key);
}

export function isProduction(): boolean {
  const mode = readServerEnv("NODE_ENV") ?? readImportMetaEnv()?.MODE;
  return mode === "production";
}
