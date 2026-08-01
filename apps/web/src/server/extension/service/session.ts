import { external, fail, invalid, type DomainError } from "~/domain/errors";
import { InstallationId } from "~/domain/ids";
import { Err, Ok, isErr, type Result } from "~/shared/result";

import type { RefreshExtensionSessionResponse } from "../contracts";
import { hashExtensionSecretToken } from "../crypto";
import { upsertSyncHealth } from "./presence";
import { type ExtensionRepos, hasActiveAuthSession } from "./shared";
import {
  installationSessionExpiresAt,
  issueSessionCredentials,
} from "./tokens";
import {
  isCryptoMisconfiguration,
  isInvalidExtensionToken,
} from "./validators";

interface SessionMethodContext {
  repos: ExtensionRepos;
  now: Date;
}

export async function refreshInstallationSession(
  context: SessionMethodContext,
  input: {
    refreshToken: string;
    installationId: string;
  },
): Promise<Result<RefreshExtensionSessionResponse, DomainError>> {
  const { repos, now } = context;

  try {
    const installationId = InstallationId.parse(input.installationId);
    if (isErr(installationId)) {
      return Err(invalid({ code: "installation_invalid" }));
    }

    const currentTime = now;
    const refreshTokenHash = await hashExtensionSecretToken(input.refreshToken);
    const session =
      await repos.extensionRuntime.findRefreshableInstallationSession(
        refreshTokenHash,
        installationId.value,
        currentTime,
      );
    if (!session) {
      return Err(fail("extension_session_invalid"));
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
      return Err(fail("extension_session_invalid"));
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
          : "Unexpected extension session refresh failure",
        { code: "unexpected" },
      ),
    );
  }
}
