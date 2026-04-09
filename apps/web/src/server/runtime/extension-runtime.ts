import { db } from "~/lib/db/db";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { createExtensionRuntimeRepo } from "../extension/repos";
import { createExtensionService } from "../extension/service";

function createExtensionRepos(executor: DatabaseExecutor) {
  return {
    contactAssignments: createContactAssignmentsRepo(executor),
    contacts: createContactsRepo(executor),
    extensionRuntime: createExtensionRuntimeRepo(executor),
    organizations: createOrganizationsRepo(executor),
    sessions: createSessionRepository(executor),
  };
}

export function createExtensionRuntime() {
  const extensionService = createExtensionService(createExtensionRepos(db), {
    runInTransaction(operation) {
      return db
        .transaction()
        .execute((transactionDb) =>
          operation(createExtensionRepos(transactionDb)),
        );
    },
  });

  return { extensionService };
}

export const extensionRuntime = createExtensionRuntime();
