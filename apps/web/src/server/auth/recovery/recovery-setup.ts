import { getDefaultAppPath } from "~/domain/auth/access/route-policy";
import { fail, type DomainError } from "~/domain/errors";
import type { AuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import { replaceSession } from "~/server/auth/session/replace-session";
import type { AppContext } from "~/server/platform/action/context";
import { Err, Ok, type Result } from "~/shared/result";

import { regenerateRecoveryCodes } from "./issue-recovery-codes";

interface RecoverySetupTransition {
  redirectTo: string;
  sessionToken: string;
}

export function regenerateRecoverySetup(
  ctx: AppContext,
  deps: AuthSetupContext,
): Promise<
  Result<{ recoveryCodes: string[]; sessionToken: string }, DomainError>
> {
  const regeneratedAt = ctx.now();

  return deps.uow.run(async (repos) => {
    const user = await repos.users.findByIdForUpdate(ctx.actor.userId);
    if (!user?.onboarding_completed_at) return Err(fail("invalid_input"));

    const recoveryCodes = await regenerateRecoveryCodes(
      repos,
      user.id,
      regeneratedAt,
    );
    const sessionToken = await replaceSession(repos, {
      current: ctx.actor,
      user,
      sessionClass: "recovery_setup",
      strongAuthMethod: ctx.actor.strongAuthMethod,
      strongAuthAt: ctx.actor.strongAuthAt,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      issuedAt: regeneratedAt,
    });

    return Ok({
      recoveryCodes,
      sessionToken,
    });
  });
}

export async function acknowledgeRecoverySetup(
  ctx: AppContext,
  deps: AuthSetupContext,
): Promise<Result<RecoverySetupTransition, DomainError>> {
  if (ctx.actor.sessionClass !== "recovery_setup") {
    return Err(fail("invalid_input"));
  }
  const acknowledgedAt = ctx.now();

  return deps.uow.run(async (repos) => {
    const user = await repos.users.findByIdForUpdate(ctx.actor.userId);
    if (!user?.onboarding_completed_at) return Err(fail("invalid_input"));

    const acknowledged = await repos.userRecoveryCodes.acknowledgeActiveSet(
      user.id,
      acknowledgedAt,
    );
    if (!acknowledged) return Err(fail("invalid_input"));

    const sessionToken = await replaceSession(repos, {
      current: ctx.actor,
      user,
      sessionClass: "app",
      strongAuthMethod: ctx.actor.strongAuthMethod,
      strongAuthAt: ctx.actor.strongAuthAt,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      issuedAt: acknowledgedAt,
    });

    return Ok({
      redirectTo: getDefaultAppPath(user.role),
      sessionToken,
    });
  });
}
