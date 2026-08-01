import {
  createDefaultEngineClient,
  type EngineClient,
} from "~/server/integrations/engine/client";
import { engineConfig } from "~/server/platform/config/env";

export function createEngineClient(): EngineClient {
  return createDefaultEngineClient(engineConfig());
}
