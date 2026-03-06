import type { Role } from "~/lib/auth/access/rbac";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { env } from "~/lib/env";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  EXTENSION_HANDOFF_TOKEN_AUDIENCE,
  EXTENSION_HANDOFF_TOKEN_ISSUER,
  EXTENSION_SESSION_TOKEN_AUDIENCE,
  type ClaimExtensionSessionResponse,
  type CreateExtensionHandoffTokenResponse,
  type ExtensionExecutivePresenceStatus,
  type ExtensionHandoffClaims,
  type ExtensionInstallationSessionClaims,
  type ExtensionRuntimeEventEnvelope,
  type ExtensionSyncHealth,
  type RefreshExtensionSessionResponse,
  type TeamExecutiveStatusView,
} from "./contracts";
import {
  hashExtensionSecretToken,
  signExtensionToken,
  verifyExtensionToken,
} from "./crypto";

interface ExtensionServiceDeps {
  now?: () => number;
  runInTransaction?: <T>(
    operation: (transactionRepos: Repositories) => Promise<T>,
  ) => Promise<T>;
}

const EXECUTIVE_STATUS_OFFLINE_AFTER_MS = 2 * 60_000;
const EXECUTIVE_SYNC_STALE_AFTER_MS = 2 * 60_000;
const EXTENSION_HANDOFF_TTL_MS = 120_000;
const EXTENSION_INSTALLATION_SESSION_TTL_MS = 8 * 60 * 60_000;
const EXTENSION_ACCESS_TOKEN_TTL_MS = 15 * 60_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface InstallationSessionRecord {
  jti: string;
  user_id: number;
  branch_id: number;
  auth_session_id: string;
  installation_id: string;
  refresh_token_hash: string;
  issued_at: number;
  expires_at: number;
  revoked_at: number | null;
  last_seen_at: number | null;
  refreshed_at: number | null;
}

interface SessionCredentials {
  refreshToken: string;
  sessionToken: string;
  expiresAt: number;
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
  | { reason: "event_duplicate"; message: string }
  | { reason: "unexpected"; message: string };

function mapLifecycleStatus(
  event: Extract<ExtensionRuntimeEventEnvelope, { type: "call.lifecycle" }>,
): Exclude<ExtensionExecutivePresenceStatus, "idle" | "ready" | "offline"> {
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

function withDerivedProjectionStatuses(
  statuses: TeamExecutiveStatusView[],
  now: number,
): TeamExecutiveStatusView[] {
  return statuses.map((status) => {
    return {
      ...status,
      presenceStatus:
        status.presenceStatus === null ||
        status.presenceUpdatedAt === null ||
        now - status.presenceUpdatedAt < EXECUTIVE_STATUS_OFFLINE_AFTER_MS
          ? status.presenceStatus
          : "offline",
      syncHealth:
        status.syncHealth === "reauth_required" ||
        (status.syncUpdatedAt !== null &&
          now - status.syncUpdatedAt < EXECUTIVE_SYNC_STALE_AFTER_MS)
          ? status.syncHealth
          : "stale",
    };
  });
}

async function upsertSyncHealth(
  repos: Repositories,
  values: {
    userId: number;
    branchId: number;
    syncHealth: ExtensionSyncHealth;
    updatedAt: number;
  },
): Promise<void> {
  await repos.extensionRuntime.upsertExecutiveSyncHealth({
    user_id: values.userId,
    branch_id: values.branchId,
    sync_health: values.syncHealth,
    sync_updated_at: values.updatedAt,
  });
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isExtensionHandoffClaims(
  value: unknown,
): value is ExtensionHandoffClaims {
  return (
    typeof value === "object" &&
    value !== null &&
    "iss" in value &&
    value.iss === EXTENSION_HANDOFF_TOKEN_ISSUER &&
    "aud" in value &&
    value.aud === EXTENSION_HANDOFF_TOKEN_AUDIENCE &&
    "sub" in value &&
    typeof value.sub === "string" &&
    "authSessionId" in value &&
    typeof value.authSessionId === "string" &&
    "branchId" in value &&
    typeof value.branchId === "number" &&
    "assignmentId" in value &&
    typeof value.assignmentId === "number" &&
    "contactId" in value &&
    typeof value.contactId === "number" &&
    "phone" in value &&
    typeof value.phone === "string" &&
    "clientName" in value &&
    (value.clientName === null || typeof value.clientName === "string") &&
    "organizationLabel" in value &&
    (value.organizationLabel === null ||
      typeof value.organizationLabel === "string") &&
    "action" in value &&
    value.action === "start_call" &&
    "origin" in value &&
    typeof value.origin === "string" &&
    "jti" in value &&
    typeof value.jti === "string" &&
    "iat" in value &&
    typeof value.iat === "number" &&
    "exp" in value &&
    typeof value.exp === "number"
  );
}

function isExtensionInstallationSessionClaims(
  value: unknown,
): value is ExtensionInstallationSessionClaims {
  return (
    typeof value === "object" &&
    value !== null &&
    "iss" in value &&
    value.iss === EXTENSION_HANDOFF_TOKEN_ISSUER &&
    "aud" in value &&
    value.aud === EXTENSION_SESSION_TOKEN_AUDIENCE &&
    "sub" in value &&
    typeof value.sub === "string" &&
    "authSessionId" in value &&
    typeof value.authSessionId === "string" &&
    "branchId" in value &&
    typeof value.branchId === "number" &&
    "installationId" in value &&
    typeof value.installationId === "string" &&
    "jti" in value &&
    typeof value.jti === "string" &&
    "iat" in value &&
    typeof value.iat === "number" &&
    "exp" in value &&
    typeof value.exp === "number"
  );
}

function isTokenExpired(expSeconds: number, nowMs: number): boolean {
  return expSeconds <= Math.floor(nowMs / 1000);
}

function accessTokenExpiresAt(issuedAt: number): number {
  return issuedAt + EXTENSION_ACCESS_TOKEN_TTL_MS;
}

function installationSessionExpiresAt(issuedAt: number): number {
  return issuedAt + EXTENSION_INSTALLATION_SESSION_TTL_MS;
}

function parseSubjectUserId(subject: string): number | null {
  if (!subject.startsWith("user:")) {
    return null;
  }

  const parsed = Number(subject.slice("user:".length));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function generateRefreshToken(): string {
  return crypto.randomUUID();
}

async function signInstallationSessionToken(
  session: InstallationSessionRecord,
  issuedAt: number,
): Promise<string> {
  return signExtensionToken({
    iss: EXTENSION_HANDOFF_TOKEN_ISSUER,
    aud: EXTENSION_SESSION_TOKEN_AUDIENCE,
    sub: `user:${session.user_id}`,
    authSessionId: session.auth_session_id,
    branchId: session.branch_id,
    installationId: session.installation_id,
    jti: session.jti,
    iat: issuedAt,
    exp: Math.floor(accessTokenExpiresAt(issuedAt) / 1000),
  });
}

async function issueSessionCredentials(
  repos: Repositories,
  session: InstallationSessionRecord,
  issuedAt: number,
): Promise<SessionCredentials> {
  const refreshToken = generateRefreshToken();
  await repos.extensionRuntime.rotateInstallationSessionRefreshToken({
    jti: session.jti,
    refresh_token_hash: await hashExtensionSecretToken(refreshToken),
    refreshed_at: issuedAt,
    expires_at: installationSessionExpiresAt(issuedAt),
  });

  return {
    refreshToken,
    sessionToken: await signInstallationSessionToken(session, issuedAt),
    expiresAt: accessTokenExpiresAt(issuedAt),
  };
}

async function hasActiveAuthSession(
  repos: Repositories,
  authSessionId: string,
  nowMs: number,
): Promise<boolean> {
  const authSession = await repos.sessions.findById(authSessionId);
  return authSession !== null && authSession.expires_at > nowMs;
}

function isCryptoMisconfiguration(error: unknown): boolean {
  return error instanceof Error && error.message.includes("private key");
}

export function createExtensionService(
  repos: Repositories,
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
          phone: contact.phone_primary ?? "",
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

        const credentials = await runInTransaction(async (txRepos) => {
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

            const consumeResult = await txRepos.extensionRuntime.consumeHandoff(
              {
                jti: handoff.jti,
                installation_id: input.installationId,
                installation_session_jti: sessionJti,
                consumed_at: claimedAt,
              },
            );
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
              if (!reusableSession) {
                await txRepos.extensionRuntime.createInstallationSession({
                  jti: sessionJti,
                  user_id: handoff.user_id,
                  branch_id: handoff.branch_id,
                  auth_session_id: handoff.auth_session_id,
                  installation_id: input.installationId,
                  refresh_token_hash: await hashExtensionSecretToken(
                    generateRefreshToken(),
                  ),
                  issued_at: claimedAt,
                  expires_at: installationSessionExpiresAt(claimedAt),
                });
              }
              const activeSession =
                await txRepos.extensionRuntime.findValidInstallationSession(
                  sessionJti,
                  claimedAt,
                );
              if (!activeSession) {
                throw new Error("session missing after claim");
              }
              session = activeSession;
            }
          }

          const sessionCredentials = await issueSessionCredentials(
            txRepos,
            session,
            claimedAt,
          );
          await upsertSyncHealth(txRepos, {
            userId: session.user_id,
            branchId: session.branch_id,
            syncHealth: "ok",
            updatedAt: claimedAt,
          });
          return sessionCredentials;
        });

        return Ok(credentials);
      } catch (error: unknown) {
        if (isCryptoMisconfiguration(error)) {
          return Err({
            reason: "misconfigured",
            message: "Extension signing keys are not configured",
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

        const credentials = await issueSessionCredentials(
          repos,
          session,
          currentTime,
        );
        await upsertSyncHealth(repos, {
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

        const subjectUserId = parseSubjectUserId(sessionClaims.sub);
        const session =
          await repos.extensionRuntime.findValidInstallationSession(
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
            message: "Extension session token is invalid or expired",
          });
        }

        await repos.extensionRuntime.touchInstallationSession(
          session.jti,
          currentTime,
        );

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

        await upsertSyncHealth(repos, {
          userId: session.user_id,
          branchId: session.branch_id,
          syncHealth: "ok",
          updatedAt: currentTime,
        });

        if (input.event.type === "executive.presence") {
          await repos.extensionRuntime.upsertExecutivePresence({
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
          await repos.extensionRuntime.upsertExecutivePresence({
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
