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

type CreateHandoffTokenInput = Parameters<typeof createHandoffToken>[1];
type ClaimInstallationSessionInput = Parameters<
  typeof claimInstallationSession
>[1];
type RefreshInstallationSessionInput = Parameters<
  typeof refreshInstallationSession
>[1];
type IngestRuntimeEventInput = Parameters<typeof ingestRuntimeEvent>[1];
type ListTeamExecutiveStatusesInput = Parameters<
  typeof listTeamExecutiveStatuses
>[1];

export function createExtensionService(
  repos: ExtensionRepos,
  deps: ExtensionServiceDeps,
) {
  const now = deps.now ?? (() => new Date());
  const uow = deps.uow;

  return {
    createHandoffToken: (input: CreateHandoffTokenInput) =>
      createHandoffToken(
        {
          repos,
          now,
          uow,
        },
        input,
      ),

    claimInstallationSession: (input: ClaimInstallationSessionInput) =>
      claimInstallationSession(
        {
          repos,
          now,
          uow,
        },
        input,
      ),

    refreshInstallationSession: (input: RefreshInstallationSessionInput) =>
      refreshInstallationSession(
        {
          repos,
          now,
        },
        input,
      ),

    ingestRuntimeEvent: (input: IngestRuntimeEventInput) =>
      ingestRuntimeEvent(
        {
          repos,
          now,
          uow,
        },
        input,
      ),

    listTeamExecutiveStatuses: (input: ListTeamExecutiveStatusesInput) =>
      listTeamExecutiveStatuses(
        {
          repos,
          now,
        },
        input,
      ),
  };
}
