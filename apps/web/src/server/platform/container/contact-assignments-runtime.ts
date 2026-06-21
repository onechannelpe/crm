import { createContactAssignmentsContext } from "~/server/contact-assignments/infrastructure/context";
import type { EngineClient } from "~/server/shared/engine/client";

import type { ServerInfra } from "./infra";

export function createContactAssignmentsRuntime(
  infra: ServerInfra,
  engine: EngineClient,
) {
  return createContactAssignmentsContext({
    executor: infra.db,
    engine,
  });
}
