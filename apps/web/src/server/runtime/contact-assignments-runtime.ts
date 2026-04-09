import { createContactAssignmentContext } from "~/server/contact-assignments/infrastructure/assignment-context";
import { createContactAssignmentInteractionRunner } from "~/server/contact-assignments/infrastructure/interaction-context";
import { createContactAssignmentReadContext } from "~/server/contact-assignments/infrastructure/read-context";
import { engineClient } from "~/server/shared/composition-root";

import type { ServerInfra } from "./infra";

export function createContactAssignmentsRuntime(infra: ServerInfra) {
  return {
    assignment: createContactAssignmentContext({
      executor: infra.db,
      engine: engineClient,
    }),
    interactionRunner: createContactAssignmentInteractionRunner(infra.db),
    read: createContactAssignmentReadContext(infra.db),
  };
}
