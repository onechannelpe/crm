import type { Kysely, Transaction } from "kysely";

import type { SessionRevocationDeps } from "~/server/auth/application/ports";
import { createEventsWriter } from "~/server/event-logs/events-repo";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import type { Database } from "~/server/platform/database/types";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createSessionRepository } from "~/server/sessions/repos-sessions";

function createSessionRevocationTx(tx: Transaction<Database>) {
  return {
    sessions: createSessionRepository(tx),
    extensionRuntime: createExtensionRuntimeRepo(tx),
    events: createEventsWriter(tx),
  };
}

export function createSessionRevocationContext(
  db: Kysely<Database>,
): SessionRevocationDeps {
  return {
    uow: createExecutorUow(db, createSessionRevocationTx),
  };
}
