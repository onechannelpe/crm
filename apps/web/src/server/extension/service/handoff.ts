import { env } from "~/lib/env";
import type { AssignmentId, BranchId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  EXTENSION_HANDOFF_TOKEN_AUDIENCE,
  EXTENSION_HANDOFF_TOKEN_ISSUER,
  type ClaimExtensionSessionResponse,
  type CreateExtensionHandoffTokenResponse,
} from "../contracts";
import { signExtensionToken, verifyExtensionToken } from "../crypto";
import { upsertSyncHealth } from "./presence";
import {
  type ExtensionRepos,
  type ExtensionServiceError,
  hasActiveAuthSession,
} from "./shared";
import {
  type InstallationSessionRecord,
  type SessionCredentials,
  installationSessionExpiresAt,
  issueSessionCredentials,
} from "./tokens";
import {
  isCryptoMisconfiguration,
  isExtensionHandoffClaims,
  isInvalidExtensionToken,
  isTokenExpired,
  isUuid,
  parseSubjectUserId,
} from "./validators";

const EXTENSION_HANDOFF_TTL_MS = 120_000;

interface HandoffMethodContext {
  repos: ExtensionRepos;
  now: () => number;
  runInTransaction?: <T>(
    operation: (transactionRepos: ExtensionRepos) => Promise<T>,
  ) => Promise<T>;
}

export async function createHandoffToken(
  context: HandoffMethodContext,
  input: {
    userId: UserId;
    authSessionId: string;
    branchId: BranchId;
    assignmentId: AssignmentId;
    origin: string;
  },
): Promise<Result<CreateExtensionHandoffTokenResponse, ExtensionServiceError>> {
  const { repos, now } = context;

  try {
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
      input.assignmentId,
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
      assignmentId: input.assignmentId,
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
      assignment_id: input.assignmentId,
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
}

export async function claimInstallationSession(
  context: HandoffMethodContext,
  input: {
    handoffToken: string;
    installationId: string;
  },
): Promise<Result<ClaimExtensionSessionResponse, ExtensionServiceError>> {
  const { now, runInTransaction } = context;

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

          const consumeResult = await txRepos.extensionRuntime.consumeHandoff({
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
          await txRepos.extensionRuntime.rotateInstallationSessionRefreshToken({
            jti: session.jti,
            refresh_token_hash: sessionCredentials.refreshTokenHash,
            refreshed_at: claimedAt,
            expires_at: installationSessionExpiresAt(claimedAt),
          });
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
}
