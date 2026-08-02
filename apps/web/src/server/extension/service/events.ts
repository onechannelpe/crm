import type { Role } from "~/domain/auth/access/rbac";
import { external, fail, type DomainError } from "~/domain/errors";
import {
  ContactAssignmentId,
  OrganizationPersonId,
  type BranchId,
  type UserId,
} from "~/domain/ids";
import { dateFromEpochMilliseconds } from "~/domain/time/clock";
import type { AppUow } from "~/server/platform/database/uow";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, Ok, isErr, type Result } from "~/shared/result";

import {
  type ExtensionRuntimeEventEnvelope,
  type TeamExecutiveStatusView,
} from "../contracts";
import { verifyExtensionToken } from "../crypto";
import {
  mapLifecycleStatus,
  upsertSyncHealth,
  withDerivedProjectionStatuses,
} from "./presence";
import { type ExtensionRepos, hasActiveAuthSession } from "./shared";
import {
  isCryptoMisconfiguration,
  isExtensionInstallationSessionClaims,
  isInvalidExtensionToken,
  isTokenExpired,
  parseSubjectUserId,
} from "./validators";

interface EventsWriteContext extends OperationContext {
  repos: ExtensionRepos;
  uow: AppUow<ExtensionRepos>;
}
interface EventsReadContext extends OperationContext {
  repos: ExtensionRepos;
}

function readAssignmentId(
  payload: ExtensionRuntimeEventEnvelope["payload"],
): Result<ContactAssignmentId | null, DomainError> {
  if (
    !("assignmentId" in payload) ||
    typeof payload.assignmentId !== "string"
  ) {
    return Ok(null);
  }
  return ContactAssignmentId.parse(payload.assignmentId);
}

function readContactId(
  payload: ExtensionRuntimeEventEnvelope["payload"],
): Result<OrganizationPersonId | null, DomainError> {
  if (!("contactId" in payload) || typeof payload.contactId !== "string") {
    return Ok(null);
  }
  return OrganizationPersonId.parse(payload.contactId);
}

export async function ingestRuntimeEvent(
  context: EventsWriteContext,
  input: {
    sessionToken: string;
    event: ExtensionRuntimeEventEnvelope;
  },
): Promise<Result<void, DomainError>> {
  const { uow } = context;

  try {
    const sessionClaims = await verifyExtensionToken(
      input.sessionToken,
      isExtensionInstallationSessionClaims,
    );
    const currentTime = context.operationAt;
    if (isTokenExpired(sessionClaims.exp, currentTime)) {
      return Err(fail("extension_session_invalid"));
    }

    const eventAssignmentId = readAssignmentId(input.event.payload);
    if (isErr(eventAssignmentId)) {
      return eventAssignmentId;
    }

    const eventContactId = readContactId(input.event.payload);
    if (isErr(eventContactId)) {
      return eventContactId;
    }

    const payloadText = JSON.stringify(input.event.payload);
    const eventSessionId =
      "sessionId" in input.event.payload &&
      typeof input.event.payload.sessionId === "string"
        ? input.event.payload.sessionId
        : null;
    const eventCreatedAt = dateFromEpochMilliseconds(input.event.createdAt);

    return await uow.run(async (txRepos) => {
      const subjectUserId = parseSubjectUserId(sessionClaims.sub);
      const session =
        await txRepos.extensionRuntime.findValidInstallationSession(
          sessionClaims.jti,
          currentTime,
        );
      if (
        !session ||
        !subjectUserId ||
        session.user_id !== subjectUserId ||
        session.branch_id !== sessionClaims.branchId ||
        session.auth_session_id !== sessionClaims.authSessionId ||
        session.installation_id !== sessionClaims.installationId
      ) {
        return Err(fail("extension_session_invalid"));
      }

      const authSessionActive = await hasActiveAuthSession(
        txRepos,
        session.auth_session_id,
        currentTime,
      );
      if (!authSessionActive) {
        await txRepos.extensionRuntime.revokeInstallationSession(
          session.jti,
          currentTime,
        );
        await txRepos.extensionRuntime.updateExecutiveSyncHealthByUser({
          user_id: session.user_id,
          sync_health: "reauth_required",
          sync_updated_at: currentTime,
        });
        return Err(fail("extension_session_invalid"));
      }

      await txRepos.extensionRuntime.touchInstallationSession(
        session.jti,
        currentTime,
      );

      const inserted =
        await txRepos.extensionRuntime.insertRuntimeEventIfAbsent({
          id: input.event.id,
          sequence: input.event.sequence,
          user_id: session.user_id,
          branch_id: session.branch_id,
          assignment_id: eventAssignmentId.value,
          contact_id: eventContactId.value,
          call_session_id: eventSessionId,
          type: input.event.type,
          payload_json: payloadText,
          created_at: eventCreatedAt,
          received_at: currentTime,
        });

      await upsertSyncHealth(txRepos.extensionRuntime, {
        userId: session.user_id,
        branchId: session.branch_id,
        syncHealth: "ok",
        updatedAt: currentTime,
      });

      if (!inserted) {
        return Ok(undefined);
      }

      if (input.event.type === "executive.presence") {
        await txRepos.extensionRuntime.upsertExecutivePresence({
          user_id: session.user_id,
          branch_id: session.branch_id,
          assignment_id: eventAssignmentId.value,
          contact_id: eventContactId.value,
          call_session_id: input.event.payload.callSessionId,
          presence_status: input.event.payload.presenceStatus,
          presence_updated_at: dateFromEpochMilliseconds(
            input.event.payload.updatedAt,
          ),
          source_event_id: input.event.id,
          source_event_sequence: input.event.sequence,
        });
        return Ok(undefined);
      }

      if (input.event.type === "call.lifecycle") {
        await txRepos.extensionRuntime.upsertExecutivePresence({
          user_id: session.user_id,
          branch_id: session.branch_id,
          assignment_id: eventAssignmentId.value,
          contact_id: eventContactId.value,
          call_session_id: eventSessionId,
          presence_status: mapLifecycleStatus(input.event),
          presence_updated_at: dateFromEpochMilliseconds(
            input.event.payload.at,
          ),
          source_event_id: input.event.id,
          source_event_sequence: input.event.sequence,
        });
      }

      return Ok(undefined);
    });
  } catch (error: unknown) {
    if (isCryptoMisconfiguration(error)) {
      return Err(
        external("Extension token keys are not configured", {
          code: "misconfigured",
        }),
      );
    }
    if (isInvalidExtensionToken(error)) {
      return Err(fail("extension_session_invalid"));
    }

    return Err(
      external(
        error instanceof Error
          ? error.message
          : "Unexpected extension event ingest failure",
        { code: "unexpected" },
      ),
    );
  }
}

export async function listTeamExecutiveStatuses(
  context: EventsReadContext,
  input: {
    role: Role;
    userId: UserId;
    branchId: BranchId;
  },
): Promise<Result<TeamExecutiveStatusView[], DomainError>> {
  const { repos } = context;

  try {
    if (input.role === "supervisor") {
      return Ok(
        withDerivedProjectionStatuses(
          await repos.extensionRuntime.listTeamStatusesBySupervisor(
            input.userId,
          ),
          context.operationAt,
        ),
      );
    }

    return Ok(
      withDerivedProjectionStatuses(
        await repos.extensionRuntime.listBranchStatuses(input.branchId),
        context.operationAt,
      ),
    );
  } catch (error: unknown) {
    return Err(
      external(
        error instanceof Error
          ? error.message
          : "Unexpected extension status read failure",
        { code: "unexpected" },
      ),
    );
  }
}
