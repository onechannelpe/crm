import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createContactsRepo } from "~/server/contacts/repos-contacts";
import { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createExecutorUow } from "~/server/shared/application/uow";

import { createExtensionRuntimeRepo } from "../extension/repos";
import { createExtensionService } from "../extension/service";
import type { ServerInfra } from "./infra";

export type ExtensionRuntimeRepos = {
  contactAssignments: ReturnType<typeof createContactAssignmentsRepo>;
  contacts: ReturnType<typeof createContactsRepo>;
  extensionRuntime: ReturnType<typeof createExtensionRuntimeRepo>;
  organizations: ReturnType<typeof createOrganizationsRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
};

export function createExtensionRuntime(infra: ServerInfra) {
  const repos: ExtensionRuntimeRepos = {
    contactAssignments: createContactAssignmentsRepo(infra.db),
    contacts: createContactsRepo(infra.db),
    extensionRuntime: createExtensionRuntimeRepo(infra.db),
    organizations: createOrganizationsRepo(infra.db),
    sessions: createSessionRepository(infra.db),
  };

  const extensionService = createExtensionService(repos, {
    uow: createExecutorUow(
      infra.db,
      (txDb): ExtensionRuntimeRepos => ({
        contactAssignments: createContactAssignmentsRepo(txDb),
        contacts: createContactsRepo(txDb),
        extensionRuntime: createExtensionRuntimeRepo(txDb),
        organizations: createOrganizationsRepo(txDb),
        sessions: createSessionRepository(txDb),
      }),
    ),
  });

  return { extensionService };
}
