// For code that runs in both server and client contexts (logger, diagnostics):
// the server reads process.env, the client reads import.meta.env (VITE_-prefixed
// only), and server values win when both are present. Server-only code should
// read process.env directly; client-only code should use import.meta.env.DEV /
// .PROD.

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
