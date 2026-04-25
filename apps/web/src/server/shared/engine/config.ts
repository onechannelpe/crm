export interface EngineClientConfig {
  baseUrl: string;
  keyId: string;
  hmacSecret: string;
  timeoutMs: number;
}

export type EngineConnectMode = "local" | "remote";

export function buildEngineClientConfig({
  engineConnectMode,
  engineUrl,
  engineHmacKeyId,
  engineHmacSecret,
  engineTimeoutMs,
}: {
  engineConnectMode: EngineConnectMode;
  engineUrl: string;
  engineHmacKeyId: string;
  engineHmacSecret: string;
  engineTimeoutMs: string;
}): EngineClientConfig {
  const url = new URL(engineUrl);

  if (url.username || url.password) {
    throw new Error("ENGINE_URL must not include credentials");
  }

  if (url.search || url.hash) {
    throw new Error("ENGINE_URL must not include query params or fragments");
  }

  const isLoopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";

  if (engineConnectMode === "local") {
    if (url.protocol !== "http:") {
      throw new Error("ENGINE_URL must use http in local mode");
    }

    if (!isLoopback) {
      throw new Error("ENGINE_URL must target a loopback host in local mode");
    }
  }

  if (engineConnectMode === "remote") {
    if (url.protocol !== "https:") {
      throw new Error("ENGINE_URL must use https in remote mode");
    }

    if (isLoopback) {
      throw new Error(
        "ENGINE_URL must not target a loopback host in remote mode",
      );
    }
  }

  const timeoutMs = Number(engineTimeoutMs);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("ENGINE_TIMEOUT_MS must be a positive integer");
  }

  return {
    baseUrl: url.href.replace(/\/$/, ""),
    keyId: engineHmacKeyId,
    hmacSecret: engineHmacSecret,
    timeoutMs,
  };
}
