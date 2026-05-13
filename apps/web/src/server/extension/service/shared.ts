import type { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import type { createContactsRepo } from "~/server/contacts/repos-contacts";
import type { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";
import type { AppUow } from "~/server/shared/application/uow";

import type { createExtensionRuntimeRepo } from "../repos";

export type ExtensionRepos = {
  contactAssignments: ReturnType<typeof createContactAssignmentsRepo>;
  contacts: ReturnType<typeof createContactsRepo>;
  extensionRuntime: ReturnType<typeof createExtensionRuntimeRepo>;
  organizations: ReturnType<typeof createOrganizationsRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
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
