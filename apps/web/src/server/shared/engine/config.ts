export interface EngineClientConfig {
  baseUrl: string;
  hmacSecret: string;
  timeoutMs: number;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function buildEngineClientConfig(input: {
  nodeEnv: string;
  engineUrl: string;
  engineHmacSecret: string;
}): EngineClientConfig {
  const url = new URL(input.engineUrl);
  if (url.username || url.password) {
    throw new Error("ENGINE_URL must not include credentials");
  }

  if (url.search || url.hash) {
    throw new Error("ENGINE_URL must not include query params or fragments");
  }

  if (input.nodeEnv === "production") {
    if (url.protocol !== "https:") {
      throw new Error("ENGINE_URL must use https in production");
    }

    if (LOCAL_HOSTS.has(url.hostname)) {
      throw new Error(
        "ENGINE_URL must target a remote engine host in production",
      );
    }
  }

  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    hmacSecret: input.engineHmacSecret,
    timeoutMs: 2000,
  };
}
