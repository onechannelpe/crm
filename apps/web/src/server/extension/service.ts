import type { Role } from "~/lib/auth/access/rbac";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { env } from "~/lib/env";
import type { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import type { createContactsRepo } from "~/server/contacts/repos-contacts";
import type { createOrganizationsRepo } from "~/server/contacts/repos-organizations";
import type { createSessionRepository } from "~/server/sessions/repos-sessions";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  EXTENSION_HANDOFF_TOKEN_AUDIENCE,
  EXTENSION_HANDOFF_TOKEN_ISSUER,
  type ClaimExtensionSessionResponse,
  type CreateExtensionHandoffTokenResponse,
  type ExtensionRuntimeEventEnvelope,
  type RefreshExtensionSessionResponse,
  type TeamExecutiveStatusView,
} from "./contracts";
import {
  hashExtensionSecretToken,
  signExtensionToken,
  verifyExtensionToken,
} from "./crypto";
import type { createExtensionRuntimeRepo } from "./repos";
import {
  mapLifecycleStatus,
  upsertSyncHealth,
  withDerivedProjectionStatuses,
} from "./service-presence";
import {
  type InstallationSessionRecord,
  type SessionCredentials,
  installationSessionExpiresAt,
  issueSessionCredentials,
} from "./service-tokens";
import {
  isCryptoMisconfiguration,
  isExtensionHandoffClaims,
  isExtensionInstallationSessionClaims,
  isInvalidExtensionToken,
  isTokenExpired,
  isUuid,
  parseSubjectUserId,
} from "./service-validators";

type ExtensionRepos = {
  contactAssignments: ReturnType<typeof createContactAssignmentsRepo>;
  contacts: ReturnType<typeof createContactsRepo>;
  extensionRuntime: ReturnType<typeof createExtensionRuntimeRepo>;
  organizations: ReturnType<typeof createOrganizationsRepo>;
  sessions: ReturnType<typeof createSessionRepository>;
};

interface ExtensionServiceDeps {
  now?: () => number;
  runInTransaction?: <T>(
    operation: (transactionRepos: ExtensionRepos) => Promise<T>,
  ) => Promise<T>;
}

const EXTENSION_HANDOFF_TTL_MS = 120_000;

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

async function hasActiveAuthSession(
  repos: ExtensionRepos,
  authSessionId: string,
  nowMs: number,
): Promise<boolean> {
  const authSession = await repos.sessions.findById(authSessionId);
  return authSession !== null && authSession.expires_at > nowMs;
}

export function createExtensionService(
  repos: ExtensionRepos,
  deps: ExtensionServiceDeps = {},
) {
  const now = deps.now ?? (() => Date.now());
  const runInTransaction = deps.runInTransaction;

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

        const assignment = await repos.contactAssignments.findActiveByIdForUser(
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
        if (!contact.phone_primary || contact.phone_primary.trim() === "") {
          return Err({
            reason: "assignment_inactive",
            message: "Assigned contact does not have a callable primary phone",
          });
        }

        const organization = await repos.organizations.findById(
          contact.organization_id,
        );
        const issuedAt = now();
        const handoffExpiresAt = issuedAt + EXTENSION_HANDOFF_TTL_MS;
        const handoffJti = crypto.randomUUID();

        const handoffToken = await signExtensionToken({
          iss: EXTENSION_HANDOFF_TOKEN_ISSUER,
          aud: EXTENSION_HANDOFF_TOKEN_AUDIENCE,
          sub: `user:${input.userId}`,
          authSessionId: input.authSessionId,
          branchId: input.branchId,
          assignmentId,
          contactId: contact.id,
          phone: contact.phone_primary,
          clientName: contact.name,
          organizationLabel: organization ? `Org #${organization.id}` : null,
          action: "start_call",
          origin: input.origin,
          jti: handoffJti,
          iat: issuedAt,
          exp: Math.floor(handoffExpiresAt / 1000),
        });

        await repos.extensionRuntime.createHandoff({
          jti: handoffJti,
          user_id: input.userId,
          branch_id: input.branchId,
          auth_session_id: input.authSessionId,
          assignment_id: assignmentId,
          issued_at: issuedAt,
          expires_at: handoffExpiresAt,
          origin: input.origin,
        });

        return Ok({
          handoffToken,
          expiresAt: handoffExpiresAt,
        });
      } catch (error: unknown) {
        if (isCryptoMisconfiguration(error)) {
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

    async claimInstallationSession(input: {
      handoffToken: string;
      installationId: string;
    }): Promise<Result<ClaimExtensionSessionResponse, ExtensionServiceError>> {
      try {
        if (!isUuid(input.installationId)) {
          return Err({
            reason: "installation_invalid",
            message: "Extension installation ID must be a UUID",
          });
        }
        if (!runInTransaction) {
          return Err({
            reason: "unexpected",
            message: "Extension transaction runner is not configured",
          });
        }

        const handoffClaims = await verifyExtensionToken(
          input.handoffToken,
          isExtensionHandoffClaims,
        );
        const claimedAt = now();
        if (isTokenExpired(handoffClaims.exp, claimedAt)) {
          return Err({
            reason: "handoff_invalid",
            message: "Extension handoff token is invalid or expired",
          });
        }

        const userId = parseSubjectUserId(handoffClaims.sub);
        if (!userId) {
          return Err({
            reason: "handoff_invalid",
            message: "Extension handoff token is invalid or expired",
          });
        }

        const credentials: SessionCredentials = await runInTransaction(
          async (txRepos) => {
            const handoff = await txRepos.extensionRuntime.findHandoffByJti(
              handoffClaims.jti,
            );
            if (
              !handoff ||
              handoff.expires_at <= claimedAt ||
              handoff.origin !== handoffClaims.origin ||
              handoff.user_id !== userId ||
              handoff.branch_id !== handoffClaims.branchId ||
              handoff.auth_session_id !== handoffClaims.authSessionId ||
              handoff.assignment_id !== handoffClaims.assignmentId
            ) {
              throw new Error("invalid handoff");
            }

            const authSessionActive = await hasActiveAuthSession(
              txRepos,
              handoff.auth_session_id,
              claimedAt,
            );
            if (!authSessionActive) {
              throw new Error("invalid handoff");
            }

            let session: InstallationSessionRecord;
            let sessionCredentials: SessionCredentials | null = null;
            if (handoff.consumed_at !== null) {
              if (
                handoff.installation_id !== input.installationId ||
                !handoff.installation_session_jti
              ) {
                throw new Error("handoff claimed by another installation");
              }

              const existingSession =
                await txRepos.extensionRuntime.findValidInstallationSession(
                  handoff.installation_session_jti,
                  claimedAt,
                );
              if (!existingSession) {
                throw new Error("handoff session expired");
              }
              session = existingSession;
            } else {
              const reusableSession =
                await txRepos.extensionRuntime.findActiveInstallationSession(
                  handoff.auth_session_id,
                  input.installationId,
                  claimedAt,
                );
              const sessionJti = reusableSession?.jti ?? crypto.randomUUID();

              const consumeResult =
                await txRepos.extensionRuntime.consumeHandoff({
                  jti: handoff.jti,
                  installation_id: input.installationId,
                  installation_session_jti: sessionJti,
                  consumed_at: claimedAt,
                });
              if (Number(consumeResult.numUpdatedRows ?? 0) === 0) {
                const racedHandoff =
                  await txRepos.extensionRuntime.findHandoffByJti(handoff.jti);
                if (
                  !racedHandoff ||
                  racedHandoff.installation_id !== input.installationId ||
                  !racedHandoff.installation_session_jti
                ) {
                  throw new Error("handoff claimed by another installation");
                }
                const racedSession =
                  await txRepos.extensionRuntime.findValidInstallationSession(
                    racedHandoff.installation_session_jti,
                    claimedAt,
                  );
                if (!racedSession) {
                  throw new Error("handoff session expired");
                }
                session = racedSession;
              } else {
                if (reusableSession) {
                  session = reusableSession;
                } else {
                  const newSession = {
                    jti: sessionJti,
                    user_id: handoff.user_id,
                    branch_id: handoff.branch_id,
                    auth_session_id: handoff.auth_session_id,
                    installation_id: input.installationId,
                    refresh_token_hash: "",
                    issued_at: claimedAt,
                    expires_at: installationSessionExpiresAt(claimedAt),
                    revoked_at: null,
                    last_seen_at: null,
                    refreshed_at: claimedAt,
                  } satisfies InstallationSessionRecord;
                  sessionCredentials = await issueSessionCredentials(
                    newSession,
                    claimedAt,
                  );
                  await txRepos.extensionRuntime.createInstallationSession({
                    jti: newSession.jti,
                    user_id: newSession.user_id,
                    branch_id: newSession.branch_id,
                    auth_session_id: newSession.auth_session_id,
                    installation_id: newSession.installation_id,
                    refresh_token_hash: sessionCredentials.refreshTokenHash,
                    issued_at: newSession.issued_at,
                    expires_at: newSession.expires_at,
                  });
                  session = {
                    ...newSession,
                    refresh_token_hash: sessionCredentials.refreshTokenHash,
                  };
                }
              }
            }

            await txRepos.extensionRuntime.revokeOtherInstallationSessionsByUser(
              session.user_id,
              session.jti,
              claimedAt,
            );
            if (sessionCredentials === null) {
              sessionCredentials = await issueSessionCredentials(
                session,
                claimedAt,
              );
              await txRepos.extensionRuntime.rotateInstallationSessionRefreshToken(
                {
                  jti: session.jti,
                  refresh_token_hash: sessionCredentials.refreshTokenHash,
                  refreshed_at: claimedAt,
                  expires_at: installationSessionExpiresAt(claimedAt),
                },
              );
            }
            await upsertSyncHealth(txRepos.extensionRuntime, {
              userId: session.user_id,
              branchId: session.branch_id,
              syncHealth: "ok",
              updatedAt: claimedAt,
            });
            return sessionCredentials;
          },
        );

        return Ok(credentials);
      } catch (error: unknown) {
        if (isCryptoMisconfiguration(error)) {
          return Err({
            reason: "misconfigured",
            message: "Extension signing keys are not configured",
          });
        }
        if (isInvalidExtensionToken(error)) {
          return Err({
            reason: "handoff_invalid",
            message: "Extension handoff token is invalid or expired",
          });
        }
        if (
          error instanceof Error &&
          (error.message === "invalid handoff" ||
            error.message === "handoff session expired")
        ) {
          return Err({
            reason: "handoff_invalid",
            message: "Extension handoff token is invalid or expired",
          });
        }
        if (
          error instanceof Error &&
          error.message === "handoff claimed by another installation"
        ) {
          return Err({
            reason: "handoff_invalid",
            message:
              "Extension handoff token has already been claimed by another installation",
          });
        }

        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected extension session claim failure",
        });
      }
    },

    async refreshInstallationSession(input: {
      refreshToken: string;
      installationId: string;
    }): Promise<
      Result<RefreshExtensionSessionResponse, ExtensionServiceError>
    > {
      try {
        if (!isUuid(input.installationId)) {
          return Err({
            reason: "installation_invalid",
            message: "Extension installation ID must be a UUID",
          });
        }

        const currentTime = now();
        const refreshTokenHash = await hashExtensionSecretToken(
          input.refreshToken,
        );
        const session =
          await repos.extensionRuntime.findRefreshableInstallationSession(
            refreshTokenHash,
            input.installationId,
            currentTime,
          );
        if (!session) {
          return Err({
            reason: "session_invalid",
            message: "Extension session refresh is invalid or expired",
          });
        }

        const authSessionActive = await hasActiveAuthSession(
          repos,
          session.auth_session_id,
          currentTime,
        );
        if (!authSessionActive) {
          await repos.extensionRuntime.revokeInstallationSession(
            session.jti,
            currentTime,
          );
          await repos.extensionRuntime.updateExecutiveSyncHealthByUser({
            user_id: session.user_id,
            sync_health: "reauth_required",
            sync_updated_at: currentTime,
          });
          return Err({
            reason: "session_invalid",
            message: "Extension session refresh is invalid or expired",
          });
        }

        const credentials = await issueSessionCredentials(session, currentTime);
        await repos.extensionRuntime.rotateInstallationSessionRefreshToken({
          jti: session.jti,
          refresh_token_hash: credentials.refreshTokenHash,
          refreshed_at: currentTime,
          expires_at: installationSessionExpiresAt(currentTime),
        });
        await upsertSyncHealth(repos.extensionRuntime, {
          userId: session.user_id,
          branchId: session.branch_id,
          syncHealth: "ok",
          updatedAt: currentTime,
        });
        return Ok(credentials);
      } catch (error: unknown) {
        if (isCryptoMisconfiguration(error)) {
          return Err({
            reason: "misconfigured",
            message: "Extension signing keys are not configured",
          });
        }
        if (isInvalidExtensionToken(error)) {
          return Err({
            reason: "session_invalid",
            message: "Extension session token is invalid or expired",
          });
        }

        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected extension session refresh failure",
        });
      }
    },

    async ingestRuntimeEvent(input: {
      sessionToken: string;
      event: ExtensionRuntimeEventEnvelope;
    }): Promise<Result<void, ExtensionServiceError>> {
      try {
        const sessionClaims = await verifyExtensionToken(
          input.sessionToken,
          isExtensionInstallationSessionClaims,
        );
        const currentTime = now();
        if (isTokenExpired(sessionClaims.exp, currentTime)) {
          return Err({
            reason: "session_invalid",
            message: "Extension session token is invalid or expired",
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

        const run =
          runInTransaction ??
          (async <T>(
            operation: (transactionRepos: ExtensionRepos) => Promise<T>,
          ) => operation(repos));

        return await run(async (txRepos) => {
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
            return Err({
              reason: "session_invalid",
              message: "Extension session token is invalid or expired",
            });
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
            return Err({
              reason: "session_invalid",
              message: "Extension session token is invalid or expired",
            });
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
          return Err({
            reason: "misconfigured",
            message: "Extension signing keys are not configured",
          });
        }
        if (isInvalidExtensionToken(error)) {
          return Err({
            reason: "session_invalid",
            message: "Extension session token is invalid or expired",
          });
        }

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
