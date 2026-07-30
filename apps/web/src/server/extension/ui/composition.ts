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
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import { createExecutorUow } from "~/server/platform/database/uow";
import {
  createSessionRepository,
  type SessionRepository,
} from "~/server/sessions/repos-sessions";

export type ExtensionCompositionRepos = {
  contactAssignments: ContactAssignmentsRepo;
  extensionRuntime: ExtensionRuntimeRepo;
  organization: OrganizationRepository;
  sessions: SessionRepository;
};

function buildRepos(db: ServerInfrastructure["db"]): ExtensionCompositionRepos {
  return {
    contactAssignments: createContactAssignmentsRepo(db),
    extensionRuntime: createExtensionRuntimeRepo(db),
    organization: createOrganizationRepo(db),
    sessions: createSessionRepository(db),
  };
}

export function createExtensionComposition(infra: ServerInfrastructure) {
  const extensionService = createExtensionService(buildRepos(infra.db), {
    uow: createExecutorUow(infra.db, buildRepos),
  });

  return { extensionService };
}

export function composeExtension() {
  return createExtensionComposition(serverInfrastructure);
}
