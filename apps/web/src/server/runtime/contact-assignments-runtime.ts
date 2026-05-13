import { createContactAssignmentContext } from "~/server/contact-assignments/infrastructure/assignment-context";
import { createContactAssignmentReadContext } from "~/server/contact-assignments/infrastructure/read-context";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createExecutorUow } from "~/server/shared/application/uow";
import type { EngineClient } from "~/server/shared/engine/client";
import { createInteractionLogsRepo } from "~/server/shared/repos-interaction-logs";

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
    interactionUow: createExecutorUow(infra.db, (txDb) => ({
      contactAssignments: createContactAssignmentsRepo(txDb),
      interactionLogs: createInteractionLogsRepo(txDb),
    })),
    read: createContactAssignmentReadContext(infra.db),
  };
}
