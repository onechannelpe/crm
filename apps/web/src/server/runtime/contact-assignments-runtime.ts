import { createContactAssignmentContext } from "~/server/contact-assignments/infrastructure/assignment-context";
import { createContactAssignmentInteractionRunner } from "~/server/contact-assignments/infrastructure/interaction-context";
import { createContactAssignmentReadContext } from "~/server/contact-assignments/infrastructure/read-context";
import type { EngineClient } from "~/server/shared/engine/client";

import type { ServerInfra } from "./infra";

export function createContactAssignmentsRuntime(
  infra: ServerInfra,
  engine: EngineClient,
) {
  return {
    assignment: createContactAssignmentContext({
      executor: infra.db,
      engine,
    }),
    interactionRunner: createContactAssignmentInteractionRunner(infra.db),
    read: createContactAssignmentReadContext(infra.db),
  };
}
