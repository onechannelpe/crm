import "server-only";

export interface MiddlewareConfig {
  sentryIngestHost: string | null;
  trustedProxy: boolean;
}

export function middlewareConfig(
  source: Record<string, string | undefined> = process.env,
): MiddlewareConfig {
  return {
    sentryIngestHost: parseSentryIngestHost(source["SENTRY_DSN"]),
    trustedProxy: source["TRUSTED_PROXY"] === "true",
  };
}

function parseSentryIngestHost(dsn: string | undefined): string | null {
  if (!dsn) return null;

  try {
    return new URL(dsn).host;
  } catch {
    return null;
  }
}
