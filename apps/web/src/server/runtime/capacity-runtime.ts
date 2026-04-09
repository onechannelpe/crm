import { createCapacityApprovalContext } from "~/server/capacity/infrastructure/approval-context";
import { createCapacityCommandsContext } from "~/server/capacity/infrastructure/commands-context";
import { createCapacityReadContext } from "~/server/capacity/infrastructure/read-context";

import type { ServerInfra } from "./infra";

export function createCapacityRuntime(infra: ServerInfra) {
  const commands = createCapacityCommandsContext(infra.db);
  return {
    commands,
    read: createCapacityReadContext(infra.db),
    approval: createCapacityApprovalContext(commands),
  };
}
