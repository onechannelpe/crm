import { createContactAssignmentsContext } from "~/server/contact-assignments/infrastructure/context";
import type { EngineClient } from "~/server/integrations/engine/client";
import { composeEngineClient } from "~/server/integrations/ui/engine-client";
import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createContactAssignmentsComposition(
  serverInfrastructure: ServerInfrastructure,
  engine: EngineClient,
) {
  return createContactAssignmentsContext({
    executor: serverInfrastructure.db,
    engine,
  });
}

export function composeContactAssignments() {
  return createContactAssignmentsComposition(
    defaultServerInfrastructure,
    composeEngineClient(),
  );
}
