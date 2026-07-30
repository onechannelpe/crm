import {
  createDefaultEngineClient,
  type EngineClient,
} from "~/server/integrations/engine/client";
import { engineConfig } from "~/server/platform/config/env";

export function composeEngineClient(): EngineClient {
  return createDefaultEngineClient(engineConfig());
}
