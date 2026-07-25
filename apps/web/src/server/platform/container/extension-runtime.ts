import {
  createContactAssignmentsRepo,
  type ContactAssignmentsRepo,
} from "~/server/contact-assignments/infrastructure/assignment-repo";
import {
  createExtensionRuntimeRepo,
  type ExtensionRuntimeRepo,
} from "~/server/extension/repos";
import { createExtensionService } from "~/server/extension/service";
import {
  createOrganizationRepo,
  type OrganizationRepository,
} from "~/server/organization/organization-repo";
import { createExecutorUow } from "~/server/platform/database/uow";
import {
  createSessionRepository,
  type SessionRepository,
} from "~/server/sessions/repos-sessions";

import type { ServerInfra } from "./infra";

export type ExtensionRuntimeRepos = {
  contactAssignments: ContactAssignmentsRepo;
  extensionRuntime: ExtensionRuntimeRepo;
  organization: OrganizationRepository;
  sessions: SessionRepository;
};

function buildRepos(db: ServerInfra["db"]): ExtensionRuntimeRepos {
  return {
    contactAssignments: createContactAssignmentsRepo(db),
    extensionRuntime: createExtensionRuntimeRepo(db),
    organization: createOrganizationRepo(db),
    sessions: createSessionRepository(db),
  };
}

export function createExtensionRuntime(infra: ServerInfra) {
  const extensionService = createExtensionService(buildRepos(infra.db), {
    uow: createExecutorUow(infra.db, buildRepos),
  });

  return { extensionService };
}
