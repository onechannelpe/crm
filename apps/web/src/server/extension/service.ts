import type { OperationContext } from "~/server/platform/operation/context";

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
  const uow = deps.uow;

  return {
    createHandoffToken: (
      input: CreateHandoffTokenInput,
      operation: OperationContext,
    ) =>
      createHandoffToken(
        {
          repos,
          uow,
          operationAt: operation.operationAt,
        },
        input,
      ),

    claimInstallationSession: (
      input: ClaimInstallationSessionInput,
      operation: OperationContext,
    ) =>
      claimInstallationSession(
        {
          repos,
          uow,
          operationAt: operation.operationAt,
        },
        input,
      ),

    refreshInstallationSession: (
      input: RefreshInstallationSessionInput,
      operation: OperationContext,
    ) =>
      refreshInstallationSession(
        {
          repos,
          operationAt: operation.operationAt,
        },
        input,
      ),

    ingestRuntimeEvent: (
      input: IngestRuntimeEventInput,
      operation: OperationContext,
    ) =>
      ingestRuntimeEvent(
        {
          repos,
          uow,
          operationAt: operation.operationAt,
        },
        input,
      ),

    listTeamExecutiveStatuses: (
      input: ListTeamExecutiveStatusesInput,
      operation: OperationContext,
    ) =>
      listTeamExecutiveStatuses(
        {
          repos,
          operationAt: operation.operationAt,
        },
        input,
      ),
  };
}
