import type { Kysely, Transaction } from "kysely";

import type {
  AccessSecurityDeps,
  AccessSecurityTx,
} from "~/server/auth/application/ports";
import { createEventsWriter } from "~/server/event-logs/events-repo";
import { createExtensionRuntimeRepo } from "~/server/extension/repos";
import type { Database } from "~/server/platform/database/types";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createUsersRepo } from "~/server/users/repos-users";

export function createAccessSecurityTx(
  tx: Transaction<Database>,
): AccessSecurityTx {
  return {
    users: createUsersRepo(tx),
    sessions: createSessionRepository(tx),
    extensionRuntime: createExtensionRuntimeRepo(tx),
    events: createEventsWriter(tx),
  };
}

export function createAccessSecurityContext(
  db: Kysely<Database>,
): AccessSecurityDeps {
  return {
    uow: createExecutorUow(db, createAccessSecurityTx),
  };
}
