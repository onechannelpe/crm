import type { Role } from "~/lib/auth/access/rbac";
import type { AssignmentId, BranchId, UserId } from "~/server/shared/ids";

import type { ExtensionRuntimeEventEnvelope } from "./contracts";
import {
  ingestRuntimeEvent,
  listTeamExecutiveStatuses,
} from "./service/events";
import {
  claimInstallationSession,
  createHandoffToken,
} from "./service/handoff";
import { refreshInstallationSession } from "./service/session";
import type { ExtensionRepos, ExtensionServiceDeps } from "./service/shared";

export type {
  ExtensionRepos,
  ExtensionServiceDeps,
  ExtensionServiceError,
} from "./service/shared";
export { hasActiveAuthSession } from "./service/shared";

export function createExtensionService(
  repos: ExtensionRepos,
  deps: ExtensionServiceDeps = {},
) {
  const now = deps.now ?? (() => Date.now());
  const runInTransaction = deps.runInTransaction;

  return {
    createHandoffToken: (input: {
      userId: UserId;
      authSessionId: string;
      branchId: BranchId;
      assignmentId: AssignmentId;
      origin: string;
    }) =>
      createHandoffToken(
        {
          repos,
          now,
          runInTransaction,
        },
        input,
      ),

    claimInstallationSession: (input: {
      handoffToken: string;
      installationId: string;
    }) =>
      claimInstallationSession(
        {
          repos,
          now,
          runInTransaction,
        },
        input,
      ),

    refreshInstallationSession: (input: {
      refreshToken: string;
      installationId: string;
    }) =>
      refreshInstallationSession(
        {
          repos,
          now,
        },
        input,
      ),

    ingestRuntimeEvent: (input: {
      sessionToken: string;
      event: ExtensionRuntimeEventEnvelope;
    }) =>
      ingestRuntimeEvent(
        {
          repos,
          now,
          runInTransaction,
        },
        input,
      ),

    listTeamExecutiveStatuses: (input: {
      role: Role;
      userId: UserId;
      branchId: BranchId;
    }) =>
      listTeamExecutiveStatuses(
        {
          repos,
          now,
        },
        input,
      ),
  };
}
