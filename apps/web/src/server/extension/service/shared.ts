import type { ContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import type { ContactsRepo } from "~/server/contacts/repos-contacts";
import type { OrganizationsRepo } from "~/server/contacts/repos-organizations";
import type { SessionRepository } from "~/server/sessions/repos-sessions";
import type { AppUow } from "~/server/shared/application/uow";

import type { ExtensionRuntimeRepo } from "../repos";

export type ExtensionRepos = {
  contactAssignments: ContactAssignmentsRepo;
  contacts: ContactsRepo;
  extensionRuntime: ExtensionRuntimeRepo;
  organizations: OrganizationsRepo;
  sessions: SessionRepository;
};

export interface ExtensionServiceDeps {
  now?: () => number;
  uow: AppUow<ExtensionRepos>;
}

export async function hasActiveAuthSession(
  repos: ExtensionRepos,
  authSessionId: string,
  nowMs: number,
): Promise<boolean> {
  const authSession = await repos.sessions.findById(authSessionId);
  return authSession !== null && authSession.expires_at > nowMs;
}
