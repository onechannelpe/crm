import {
  createContactAssignmentsRepo,
  type ContactAssignmentsRepo,
} from "~/server/contacts/repos-assignments";
import {
  createContactsRepo,
  type ContactsRepo,
} from "~/server/contacts/repos-contacts";
import {
  createOrganizationsRepo,
  type OrganizationsRepo,
} from "~/server/contacts/repos-organizations";
import {
  createSessionRepository,
  type SessionRepository,
} from "~/server/sessions/repos-sessions";
import { createExecutorUow } from "~/server/shared/application/uow";

import {
  createExtensionRuntimeRepo,
  type ExtensionRuntimeRepo,
} from "../extension/repos";
import { createExtensionService } from "../extension/service";
import type { ServerInfra } from "./infra";

export type ExtensionRuntimeRepos = {
  contactAssignments: ContactAssignmentsRepo;
  contacts: ContactsRepo;
  extensionRuntime: ExtensionRuntimeRepo;
  organizations: OrganizationsRepo;
  sessions: SessionRepository;
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
