import { Err, Ok, type Result } from "~/server/shared/result";

import type { RefreshExtensionSessionResponse } from "../contracts";
import { hashExtensionSecretToken } from "../crypto";
import { upsertSyncHealth } from "./presence";
import {
  type ExtensionRepos,
  type ExtensionServiceError,
  hasActiveAuthSession,
} from "./shared";
import {
  installationSessionExpiresAt,
  issueSessionCredentials,
} from "./tokens";
import {
  isCryptoMisconfiguration,
  isInvalidExtensionToken,
  isUuid,
} from "./validators";

interface SessionMethodContext {
  repos: ExtensionRepos;
  now: () => number;
}

export async function refreshInstallationSession(
  context: SessionMethodContext,
  input: {
    refreshToken: string;
    installationId: string;
  },
): Promise<Result<RefreshExtensionSessionResponse, ExtensionServiceError>> {
  const { repos, now } = context;

  try {
    if (!isUuid(input.installationId)) {
      return Err({
        reason: "installation_invalid",
        message: "Extension installation ID must be a UUID",
      });
    }

    const currentTime = now();
    const refreshTokenHash = await hashExtensionSecretToken(input.refreshToken);
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
}
