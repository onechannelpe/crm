import { createInventoryRepo } from "~/server/inventory/repos";

import type { ServerInfra } from "./infra";

export function createInventoryRuntime(infra: ServerInfra) {
  return {
    inventory: createInventoryRepo(infra.db),
  };
}
