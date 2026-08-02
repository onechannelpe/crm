import "server-only";
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
import type { ServerInfrastructure } from "~/server/platform/infrastructure";
import {
  createSessionRepository,
  type SessionRepository,
} from "~/server/sessions/repos-sessions";

export type ExtensionRuntimeRepos = {
  contactAssignments: ContactAssignmentsRepo;
  extensionRuntime: ExtensionRuntimeRepo;
  organization: OrganizationRepository;
  sessions: SessionRepository;
};

function buildRepos(db: ServerInfrastructure["db"]): ExtensionRuntimeRepos {
  return {
    contactAssignments: createContactAssignmentsRepo(db),
    extensionRuntime: createExtensionRuntimeRepo(db),
    organization: createOrganizationRepo(db),
    sessions: createSessionRepository(db),
  };
}

export function createExtensionRuntime(
  serverInfrastructure: ServerInfrastructure,
) {
  const extensionService = createExtensionService(
    buildRepos(serverInfrastructure.db),
    {
      uow: createExecutorUow(serverInfrastructure.db, buildRepos),
    },
  );

  return extensionService;
}
