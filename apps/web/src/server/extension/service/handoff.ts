import { extensionConfig } from "~/lib/env";
import type { AppUow } from "~/server/shared/application/uow";
import {
  external,
  fail,
  invalid,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  EXTENSION_HANDOFF_TOKEN_AUDIENCE,
  EXTENSION_HANDOFF_TOKEN_ISSUER,
  type ClaimExtensionSessionResponse,
  type CreateExtensionHandoffTokenResponse,
} from "../contracts";
import { signExtensionToken, verifyExtensionToken } from "../crypto";
import { upsertSyncHealth } from "./presence";
import { type ExtensionRepos, hasActiveAuthSession } from "./shared";
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
  uow: AppUow<ExtensionRepos>;
}

export async function createHandoffToken(
  context: HandoffMethodContext,
  input: {
    userId: number;
    authSessionId: string;
    branchId: number;
    assignmentId: number;
    origin: string;
  },
): Promise<Result<CreateExtensionHandoffTokenResponse, DomainError>> {
  const { repos, now } = context;

  if (!Number.isInteger(input.assignmentId) || input.assignmentId < 1) {
    return Err(
      invalid({
        code: "assignment_id_positive_integer",
        details: { field: "assignment_id", rule: "positive_integer" },
      }),
    );
  }

  if (!input.origin) {
    return Err(invalid({ code: "origin_required" }));
  }

  const expectedOrigin = extensionConfig().extensionExpectedOrigin;

  if (input.origin !== expectedOrigin) {
    return Err(fail("handoff_origin_not_allowed"));
  }

  const assignmentId = input.assignmentId;

  try {
    const assignment = await repos.contactAssignments.findActiveByIdForUser(
      assignmentId,
      input.userId,
    );

    if (!assignment) {
      return Err(fail("assignment_not_found"));
    }

    const contact = await repos.contacts.findById(assignment.contact_id);

    if (!contact) {
      return Err(fail("assignment_inactive"));
    }

    if (!contact.phone_primary || contact.phone_primary.trim() === "") {
      return Err(fail("assignment_inactive"));
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
      return Err(
        external("Extension signing keys are not configured", {
          code: "misconfigured",
        }),
      );
    }

    return Err(
      external(
        error instanceof Error
          ? error.message
          : "Unexpected extension handoff failure",
        { code: "unexpected" },
      ),
    );
  }
}

export async function claimInstallationSession(
  context: HandoffMethodContext,
  input: {
    handoffToken: string;
    installationId: string;
  },
): Promise<Result<ClaimExtensionSessionResponse, DomainError>> {
  const { now, uow } = context;
  const invalidHandoff = (): Result<never, DomainError> =>
    Err(fail("handoff_invalid"));
  const claimedByOtherInstallation = (): Result<never, DomainError> =>
    Err(fail("handoff_invalid"));

  if (!isUuid(input.installationId)) {
    return Err(invalid({ code: "installation_invalid" }));
  }

  try {
    const claimedAt = now();
    const handoffClaims = await verifyExtensionToken(
      input.handoffToken,
      isExtensionHandoffClaims,
    );

    if (isTokenExpired(handoffClaims.exp, claimedAt)) {
      return invalidHandoff();
    }

    const userId = parseSubjectUserId(handoffClaims.sub);

    if (!userId) {
      return invalidHandoff();
    }

    const claimResult = await uow.run(async (txRepos) => {
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
        return invalidHandoff();
      }

      const authSessionActive = await hasActiveAuthSession(
        txRepos,
        handoff.auth_session_id,
        claimedAt,
      );

      if (!authSessionActive) {
        return invalidHandoff();
      }

      let session: InstallationSessionRecord;
      let sessionCredentials: SessionCredentials | null = null;

      if (handoff.consumed_at !== null) {
        if (
          handoff.installation_id !== input.installationId ||
          !handoff.installation_session_jti
        ) {
          return claimedByOtherInstallation();
        }

        const existingSession =
          await txRepos.extensionRuntime.findValidInstallationSession(
            handoff.installation_session_jti,
            claimedAt,
          );

        if (!existingSession) {
          return invalidHandoff();
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
          const racedHandoff = await txRepos.extensionRuntime.findHandoffByJti(
            handoff.jti,
          );

          if (
            !racedHandoff ||
            racedHandoff.installation_id !== input.installationId ||
            !racedHandoff.installation_session_jti
          ) {
            return claimedByOtherInstallation();
          }

          const racedSession =
            await txRepos.extensionRuntime.findValidInstallationSession(
              racedHandoff.installation_session_jti,
              claimedAt,
            );

          if (!racedSession) {
            return invalidHandoff();
          }

          session = racedSession;
        } else if (reusableSession) {
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

      await txRepos.extensionRuntime.revokeOtherInstallationSessionsByUser(
        session.user_id,
        session.jti,
        claimedAt,
      );

      if (sessionCredentials === null) {
        sessionCredentials = await issueSessionCredentials(session, claimedAt);

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

      return Ok(sessionCredentials);
    });

    return claimResult;
  } catch (error: unknown) {
    if (isCryptoMisconfiguration(error)) {
      return Err(
        external("Extension signing keys are not configured", {
          code: "misconfigured",
        }),
      );
    }

    if (isInvalidExtensionToken(error)) {
      return invalidHandoff();
    }

    return Err(
      external(
        error instanceof Error
          ? error.message
          : "Unexpected extension session claim failure",
        { code: "unexpected" },
      ),
    );
  }
}
