import {
  persistVerifiedPasskeyEnrollment,
  type VerifiedPasskeyEnrollment,
} from "~/server/auth/factors/passkey/service/enrollment";
import {
  persistVerifiedTotpEnrollment,
  type VerifiedTotpEnrollment,
} from "~/server/auth/factors/totp-enrollment";
import type { AuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import { issueRecoveryCodesForEnrollment } from "~/server/auth/recovery/issue-recovery-codes";
import { replaceSession } from "~/server/auth/session/replace-session";
import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

type VerifiedFactorEnrollment =
  | { method: "passkey"; enrollment: VerifiedPasskeyEnrollment }
  | { method: "totp"; enrollment: VerifiedTotpEnrollment };

export async function completeFactorEnrollment(
  ctx: AppContext,
  deps: AuthSetupContext,
  factor: VerifiedFactorEnrollment,
): Promise<
  Result<{ recoveryCodes: string[]; sessionToken: string }, DomainError>
> {
  if (factor.enrollment.userId !== ctx.actor.userId) {
    return Err(fail("invalid_input"));
  }

  const enrolledAt = ctx.now();

  return deps.uow.run(async (repos) => {
    const user = await repos.users.findByIdForUpdate(ctx.actor.userId);
    if (!user) return Err(fail("user_not_found"));

    switch (factor.method) {
      case "passkey": {
        const persisted = await persistVerifiedPasskeyEnrollment(
          repos,
          factor.enrollment,
          enrolledAt,
        );
        if (isErr(persisted)) return persisted;
        break;
      }
      case "totp": {
        const persisted = await persistVerifiedTotpEnrollment(
          repos,
          factor.enrollment,
          enrolledAt,
        );
        if (isErr(persisted)) return persisted;
        break;
      }
      default:
        factor satisfies never;
    }

    const recoveryCodes = await issueRecoveryCodesForEnrollment(
      repos,
      user.id,
      enrolledAt,
    );
    const sessionToken = await replaceSession(repos, {
      current: ctx.actor,
      user,
      sessionClass: ctx.actor.sessionClass,
      strongAuthMethod: factor.method,
      strongAuthAt: enrolledAt,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      issuedAt: enrolledAt,
    });

    return Ok({ recoveryCodes, sessionToken });
  });
}
