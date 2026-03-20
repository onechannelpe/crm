import { createEngineAdapter } from "~/server/adapters/engine/client";
import type { EngineClient } from "~/server/shared/engine/client";
import type { EngineClientConfig } from "~/server/shared/engine/config";

const engineConfig: EngineClientConfig = {
  baseUrl: process.env.ENGINE_BASE_URL ?? "http://127.0.0.1:3001",
  keyId: process.env.ENGINE_KEY_ID ?? "web",
  hmacSecret: process.env.ENGINE_HMAC_SECRET ?? "",
  timeoutMs: parseInt(process.env.ENGINE_TIMEOUT_MS ?? "5000", 10),
};

export const engineClient: EngineClient = createEngineAdapter(engineConfig);
