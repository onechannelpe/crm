import type { Role } from "~/lib/auth/access/rbac";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { env } from "~/lib/env";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  EXTENSION_HANDOFF_TOKEN_AUDIENCE,
  EXTENSION_HANDOFF_TOKEN_ISSUER,
  EXTENSION_SYNC_TOKEN_AUDIENCE,
  type CreateExtensionHandoffTokenResponse,
  type ExtensionExecutiveStatus,
  type ExtensionRuntimeEventEnvelope,
  type TeamExecutiveStatusView,
} from "./contracts";
import { hashExtensionSyncToken, signExtensionToken } from "./crypto";

interface ExtensionServiceDeps {
  now?: () => number;
}

export type ExtensionServiceError =
  | { reason: "unauthorized"; message: string }
  | { reason: "forbidden"; message: string }
  | { reason: "misconfigured"; message: string }
  | { reason: "assignment_not_found"; message: string }
  | { reason: "assignment_inactive"; message: string }
  | { reason: "invalid_origin"; message: string }
  | { reason: "sync_token_invalid"; message: string }
  | { reason: "event_duplicate"; message: string }
  | { reason: "unexpected"; message: string };

function mapLifecycleStatus(
  event: Extract<ExtensionRuntimeEventEnvelope, { type: "call.lifecycle" }>,
): ExtensionExecutiveStatus {
  switch (event.payload.event) {
    case "started":
      return "dialing";
    case "connected":
      return "active";
    case "ended":
      return "wrap_up";
  }

  throw new Error("Unsupported lifecycle event");
}

export function createExtensionService(
  repos: Repositories,
  deps: ExtensionServiceDeps = {},
) {
  const now = deps.now ?? (() => Date.now());

  return {
    async createHandoffToken(input: {
      userId: number;
      authSessionId: string;
      branchId: number;
      assignmentId: number;
      origin: string;
    }): Promise<
      Result<CreateExtensionHandoffTokenResponse, ExtensionServiceError>
    > {
      try {
        const assignmentId = assertPositiveInt(
          input.assignmentId,
          "assignmentId",
        );
        if (!input.origin) {
          return Err({
            reason: "invalid_origin",
            message: "Missing request origin",
          });
        }
        if (input.origin !== env.extensionExpectedOrigin) {
          return Err({
            reason: "invalid_origin",
            message: "Request origin is not allowed for extension handoff",
          });
        }

        const assignment = await repos.leadAssignments.findActiveByIdForUser(
          assignmentId,
          input.userId,
        );
        if (!assignment) {
          return Err({
            reason: "assignment_not_found",
            message: "Assigned client not found for current executive",
          });
        }

        const contact = await repos.contacts.findById(assignment.contact_id);
        if (!contact) {
          return Err({
            reason: "assignment_inactive",
            message: "Assigned contact is unavailable",
          });
        }

        const organization = await repos.organizations.findById(
          contact.organization_id,
        );
        const issuedAt = now();
        const handoffExpiresAt = issuedAt + 120_000;
        const syncExpiresAt = issuedAt + 8 * 60 * 60_000;
        const syncJti = crypto.randomUUID();
        const syncToken = await signExtensionToken({
          iss: EXTENSION_HANDOFF_TOKEN_ISSUER,
          aud: EXTENSION_SYNC_TOKEN_AUDIENCE,
          sub: `user:${input.userId}`,
          authSessionId: input.authSessionId,
          branchId: input.branchId,
          jti: syncJti,
          iat: issuedAt,
          exp: Math.floor(syncExpiresAt / 1000),
        });
        const syncTokenHash = await hashExtensionSyncToken(syncToken);

        await repos.extensionRuntime.createSyncToken({
          user_id: input.userId,
          branch_id: input.branchId,
          auth_session_id: input.authSessionId,
          token_hash: syncTokenHash,
          issued_at: issuedAt,
          expires_at: syncExpiresAt,
        });

        const handoffToken = await signExtensionToken({
          iss: EXTENSION_HANDOFF_TOKEN_ISSUER,
          aud: EXTENSION_HANDOFF_TOKEN_AUDIENCE,
          sub: `user:${input.userId}`,
          authSessionId: input.authSessionId,
          branchId: input.branchId,
          assignmentId,
          contactId: contact.id,
          phone: contact.phone_primary ?? "",
          clientName: contact.name,
          organizationLabel: organization ? `Org #${organization.id}` : null,
          action: "start_call",
          syncToken,
          origin: input.origin,
          jti: crypto.randomUUID(),
          iat: issuedAt,
          exp: Math.floor(handoffExpiresAt / 1000),
        });

        return Ok({
          handoffToken,
          expiresAt: handoffExpiresAt,
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("private key")) {
          return Err({
            reason: "misconfigured",
            message: "Extension signing keys are not configured",
          });
        }

        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected extension handoff failure",
        });
      }
    },

    async ingestRuntimeEvent(input: {
      syncToken: string;
      event: ExtensionRuntimeEventEnvelope;
    }): Promise<Result<void, ExtensionServiceError>> {
      try {
        const syncTokenHash = await hashExtensionSyncToken(input.syncToken);
        const syncToken = await repos.extensionRuntime.findValidSyncToken(
          syncTokenHash,
          now(),
        );
        if (!syncToken) {
          return Err({
            reason: "sync_token_invalid",
            message: "Extension sync token is invalid or expired",
          });
        }

        const duplicate = await repos.extensionRuntime.hasRuntimeEvent(
          input.event.id,
        );
        if (duplicate) {
          return Err({
            reason: "event_duplicate",
            message: "Extension event already ingested",
          });
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

        await repos.extensionRuntime.insertRuntimeEvent({
          id: input.event.id,
          user_id: syncToken.user_id,
          branch_id: syncToken.branch_id,
          assignment_id: eventAssignmentId,
          contact_id: eventContactId,
          call_session_id: eventSessionId,
          type: input.event.type,
          payload_json: payloadText,
          created_at: input.event.createdAt,
          received_at: now(),
        });

        if (input.event.type === "executive.status") {
          await repos.extensionRuntime.upsertExecutiveStatus({
            user_id: syncToken.user_id,
            branch_id: syncToken.branch_id,
            assignment_id: input.event.payload.assignmentId,
            contact_id: input.event.payload.contactId,
            call_session_id: input.event.payload.callSessionId,
            status: input.event.payload.status,
            updated_at: input.event.payload.updatedAt,
            source_event_id: input.event.id,
          });
          return Ok(undefined);
        }

        if (input.event.type === "call.lifecycle") {
          await repos.extensionRuntime.upsertExecutiveStatus({
            user_id: syncToken.user_id,
            branch_id: syncToken.branch_id,
            assignment_id: eventAssignmentId,
            contact_id: eventContactId,
            call_session_id: eventSessionId,
            status: mapLifecycleStatus(input.event),
            updated_at: input.event.payload.at,
            source_event_id: input.event.id,
          });
        }

        return Ok(undefined);
      } catch (error: unknown) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected extension event ingest failure",
        });
      }
    },

    async listTeamExecutiveStatuses(input: {
      role: Role;
      userId: number;
      branchId: number;
    }): Promise<Result<TeamExecutiveStatusView[], ExtensionServiceError>> {
      try {
        if (input.role === "supervisor") {
          return Ok(
            await repos.extensionRuntime.listTeamStatusesBySupervisor(
              input.userId,
            ),
          );
        }

        return Ok(
          await repos.extensionRuntime.listBranchStatuses(input.branchId),
        );
      } catch (error: unknown) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected extension status read failure",
        });
      }
    },
  };
}
