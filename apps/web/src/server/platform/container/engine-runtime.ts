import {
  createDefaultEngineClient,
  type EngineClient,
} from "~/server/integrations/engine/client";
import { engineConfig } from "~/server/platform/config/env";

import { memo } from "./memo";

export const getEngineRuntime: () => EngineClient = memo(() =>
  createDefaultEngineClient(engineConfig()),
);
