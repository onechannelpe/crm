export interface EngineClientConfig {
  baseUrl: string;
  keyId: string;
  hmacSecret: string;
  timeoutMs: number;
}

export type EngineConnectMode = "local" | "remote";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function buildEngineClientConfig(input: {
  engineConnectMode: EngineConnectMode;
  engineUrl: string;
  engineHmacKeyId: string;
  engineHmacSecret: string;
}): EngineClientConfig {
  const url = new URL(input.engineUrl);
  const normalizedHostname = url.hostname.replace(/^\[/, "").replace(/\]$/, "");

  if (url.username || url.password) {
    throw new Error("ENGINE_URL must not include credentials");
  }

  if (url.search || url.hash) {
    throw new Error("ENGINE_URL must not include query params or fragments");
  }

  if (input.engineConnectMode === "local") {
    if (url.protocol !== "http:") {
      throw new Error("ENGINE_URL must use http in local mode");
    }

    if (!LOCAL_HOSTS.has(normalizedHostname)) {
      throw new Error("ENGINE_URL must target a loopback host in local mode");
    }
  }

  if (input.engineConnectMode === "remote") {
    if (url.protocol !== "https:") {
      throw new Error("ENGINE_URL must use https in remote mode");
    }

    if (LOCAL_HOSTS.has(normalizedHostname)) {
      throw new Error(
        "ENGINE_URL must not target a loopback host in remote mode",
      );
    }
  }

  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    keyId: input.engineHmacKeyId,
    hmacSecret: input.engineHmacSecret,
    timeoutMs: 2000,
  };
}
