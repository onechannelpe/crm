import { env } from "~/lib/env";
import { createEngineClient } from "~/server/shared/engine/client";
import { buildEngineClientConfig } from "~/server/shared/engine/config";

export const engineClient = createEngineClient(
  buildEngineClientConfig({
    engineConnectMode: env.engineConnectMode,
    engineUrl: env.engineUrl,
    engineHmacKeyId: env.engineHmacKeyId,
    engineHmacSecret: env.engineHmacSecret,
  }),
);
