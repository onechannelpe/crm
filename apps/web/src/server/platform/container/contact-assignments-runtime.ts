import { createContactAssignmentsContext } from "~/server/contact-assignments/infrastructure/context";
import type { EngineClient } from "~/server/integrations/engine/client";

import { getEngineRuntime } from "./engine-runtime";
import { infra, type ServerInfra } from "./infra";
import { memo } from "./memo";

export function createContactAssignmentsRuntime(
  infra: ServerInfra,
  engine: EngineClient,
) {
  return createContactAssignmentsContext({
    executor: infra.db,
    engine,
  });
}

export const getContactAssignmentsRuntime = memo(() =>
  createContactAssignmentsRuntime(infra, getEngineRuntime()),
);
