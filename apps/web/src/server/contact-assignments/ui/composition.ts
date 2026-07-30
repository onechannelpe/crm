import { createContactAssignmentsContext } from "~/server/contact-assignments/infrastructure/context";
import type { EngineClient } from "~/server/integrations/engine/client";
import { composeEngineClient } from "~/server/integrations/ui/engine-client";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createContactAssignmentsComposition(
  infra: ServerInfrastructure,
  engine: EngineClient,
) {
  return createContactAssignmentsContext({
    executor: infra.db,
    engine,
  });
}

export function composeContactAssignments() {
  return createContactAssignmentsComposition(
    serverInfrastructure,
    composeEngineClient(),
  );
}
