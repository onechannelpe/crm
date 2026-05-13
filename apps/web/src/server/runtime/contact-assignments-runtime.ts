import { createContactAssignmentContext } from "~/server/contact-assignments/infrastructure/assignment-context";
import { createContactAssignmentInteractionRepos } from "~/server/contact-assignments/infrastructure/interaction-context";
import { createContactAssignmentReadContext } from "~/server/contact-assignments/infrastructure/read-context";
import { createExecutorUow } from "~/server/shared/application/uow";
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
    interactionUow: createExecutorUow(
      infra.db,
      createContactAssignmentInteractionRepos,
    ),
    read: createContactAssignmentReadContext(infra.db),
  };
}
