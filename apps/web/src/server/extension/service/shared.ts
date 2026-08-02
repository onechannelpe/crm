import type { ContactAssignmentsRepo } from "~/server/contact-assignments/infrastructure/assignment-repo";
import type { OrganizationRepository } from "~/server/organization/organization-repo";
import type { AppUow } from "~/server/platform/database/uow";
import type { SessionRepository } from "~/server/sessions/repos-sessions";

import type { ExtensionRuntimeRepo } from "../repos";

export type ExtensionRepos = {
  contactAssignments: ContactAssignmentsRepo;
  extensionRuntime: ExtensionRuntimeRepo;
  organization: OrganizationRepository;
  sessions: SessionRepository;
};

export interface ExtensionServiceDeps {
  uow: AppUow<ExtensionRepos>;
}

export async function hasActiveAuthSession(
  repos: ExtensionRepos,
  authSessionId: string,
  activeAsOf: Date,
): Promise<boolean> {
  const authSession = await repos.sessions.findById(authSessionId);
  return authSession !== null && authSession.expires_at > activeAsOf;
}
