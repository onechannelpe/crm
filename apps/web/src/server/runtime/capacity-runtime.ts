import { createCapacityCommandsContext } from "~/server/capacity/infrastructure/commands-context";
import { createCapacityReadContext } from "~/server/capacity/infrastructure/read-context";

import type { ServerInfra } from "./infra";

export function createCapacityRuntime(infra: ServerInfra) {
  return {
    commands: createCapacityCommandsContext(infra.db),
    read: createCapacityReadContext(infra.db),
  };
}
