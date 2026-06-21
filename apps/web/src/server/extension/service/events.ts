import type { Role } from "~/lib/auth/access/rbac";
import type { AppUow } from "~/server/shared/application/uow";
import { external, fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

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

interface EventsWriteContext {
  repos: ExtensionRepos;
  now: () => number;
  uow: AppUow<ExtensionRepos>;
}
interface EventsReadContext {
  repos: ExtensionRepos;
  now: () => number;
}

export async function ingestRuntimeEvent(
  context: EventsWriteContext,
  input: {
    sessionToken: string;
    event: ExtensionRuntimeEventEnvelope;
  },
): Promise<Result<void, DomainError>> {
  const { now, uow } = context;

  try {
    const sessionClaims = await verifyExtensionToken(
      input.sessionToken,
      isExtensionInstallationSessionClaims,
    );
    const currentTime = now();
    if (isTokenExpired(sessionClaims.exp, currentTime)) {
      return Err(fail("extension_session_invalid"));
    }

    const payloadText = JSON.stringify(input.event.payload);
    const eventAssignmentId =
      "assignmentId" in input.event.payload &&
      typeof input.event.payload.assignmentId === "number"
        ? input.event.payload.assignmentId
        : null;
    const eventContactId =
      "contactId" in input.event.payload &&
      typeof input.event.payload.contactId === "number"
        ? input.event.payload.contactId
        : null;
    const eventSessionId =
      "sessionId" in input.event.payload &&
      typeof input.event.payload.sessionId === "string"
        ? input.event.payload.sessionId
        : null;

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
          assignment_id: eventAssignmentId,
          contact_id: eventContactId,
          call_session_id: eventSessionId,
          type: input.event.type,
          payload_json: payloadText,
          created_at: input.event.createdAt,
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
          assignment_id: input.event.payload.assignmentId,
          contact_id: input.event.payload.contactId,
          call_session_id: input.event.payload.callSessionId,
          presence_status: input.event.payload.presenceStatus,
          presence_updated_at: input.event.payload.updatedAt,
          source_event_id: input.event.id,
          source_event_sequence: input.event.sequence,
        });
        return Ok(undefined);
      }

      if (input.event.type === "call.lifecycle") {
        await txRepos.extensionRuntime.upsertExecutivePresence({
          user_id: session.user_id,
          branch_id: session.branch_id,
          assignment_id: eventAssignmentId,
          contact_id: eventContactId,
          call_session_id: eventSessionId,
          presence_status: mapLifecycleStatus(input.event),
          presence_updated_at: input.event.payload.at,
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
    userId: number;
    branchId: number;
  },
): Promise<Result<TeamExecutiveStatusView[], DomainError>> {
  const { repos, now } = context;

  try {
    if (input.role === "supervisor") {
      return Ok(
        withDerivedProjectionStatuses(
          await repos.extensionRuntime.listTeamStatusesBySupervisor(
            input.userId,
          ),
          now(),
        ),
      );
    }

    return Ok(
      withDerivedProjectionStatuses(
        await repos.extensionRuntime.listBranchStatuses(input.branchId),
        now(),
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
