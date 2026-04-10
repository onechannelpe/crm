import type { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import type { createContactsRepo } from "~/server/contacts/repos-contacts";
import type { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";

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
  runInTransaction?: <T>(
    operation: (transactionRepos: ExtensionRepos) => Promise<T>,
  ) => Promise<T>;
}

export type ExtensionServiceError =
  | { reason: "unauthorized"; message: string }
  | { reason: "forbidden"; message: string }
  | { reason: "misconfigured"; message: string }
  | { reason: "assignment_not_found"; message: string }
  | { reason: "assignment_inactive"; message: string }
  | { reason: "invalid_origin"; message: string }
  | { reason: "handoff_invalid"; message: string }
  | { reason: "installation_invalid"; message: string }
  | { reason: "session_invalid"; message: string }
  | { reason: "unexpected"; message: string };

export async function hasActiveAuthSession(
  repos: ExtensionRepos,
  authSessionId: string,
  nowMs: number,
): Promise<boolean> {
  const authSession = await repos.sessions.findById(authSessionId);
  return authSession !== null && authSession.expires_at > nowMs;
}
