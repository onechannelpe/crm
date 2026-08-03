import { external, fail, invalid, type DomainError } from "~/domain/errors";
import { InstallationId } from "~/domain/ids";
import type { OperationContext } from "~/server/platform/operation/context";
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

interface SessionMethodContext extends OperationContext {
  repos: ExtensionRepos;
}

export async function refreshInstallationSession(
  context: SessionMethodContext,
  input: {
    refreshToken: string;
    installationId: string;
  },
): Promise<Result<RefreshExtensionSessionResponse, DomainError>> {
  const { repos } = context;

  try {
    const installationId = InstallationId.parse(input.installationId);
    if (isErr(installationId)) {
      return Err(invalid({ code: "installation_invalid" }));
    }
    const refreshTokenHash = await hashExtensionSecretToken(input.refreshToken);
    const session =
      await repos.extensionRuntime.findRefreshableInstallationSession(
        refreshTokenHash,
        installationId.value,
        context.operationAt,
      );
    if (!session) {
      return Err(fail("extension_session_invalid"));
    }

    const authSessionActive = await hasActiveAuthSession(
      repos,
      session.auth_session_id,
      context.operationAt,
    );
    if (!authSessionActive) {
      await repos.extensionRuntime.revokeInstallationSession(
        session.jti,
        context.operationAt,
      );
      await repos.extensionRuntime.updateExecutiveSyncHealthByUser({
        user_id: session.user_id,
        sync_health: "reauth_required",
        sync_updated_at: context.operationAt,
      });
      return Err(fail("extension_session_invalid"));
    }

    const credentials = await issueSessionCredentials(
      session,
      context.operationAt,
    );
    await repos.extensionRuntime.rotateInstallationSessionRefreshToken({
      jti: session.jti,
      refresh_token_hash: credentials.refreshTokenHash,
      refreshed_at: context.operationAt,
      expires_at: installationSessionExpiresAt(context.operationAt),
    });
    await upsertSyncHealth(repos.extensionRuntime, {
      userId: session.user_id,
      branchId: session.branch_id,
      syncHealth: "ok",
      updatedAt: context.operationAt,
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
