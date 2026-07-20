import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { resolveSessionClass } from "~/lib/auth/core/session-contract";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { parsePhone } from "~/lib/phone/pe-mobile";
import {
  persistVerifiedPasskeyEnrollment,
  type VerifiedPasskeyEnrollment,
} from "~/server/auth/factors/passkey/service/enrollment";
import {
  persistVerifiedTotpEnrollment,
  type VerifiedTotpEnrollment,
} from "~/server/auth/factors/totp-enrollment";
import type { AuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import { issueRecoveryCodesForEnrollment } from "~/server/auth/recovery/issue-recovery-codes";
import { replaceSession } from "~/server/auth/session/replace-session";
import type { AppContext } from "~/server/platform/action/context";
import { auditEntityId } from "~/server/shared/audit-entity";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

export type CompleteOnboardingCommand =
  | { method: "none" }
  | { method: "passkey"; enrollment: VerifiedPasskeyEnrollment }
  | { method: "totp"; enrollment: VerifiedTotpEnrollment };

export interface CompleteOnboardingResult {
  redirectTo: string;
  recoveryCodes: string[];
  sessionToken: string;
}

export async function completeOnboarding(
  ctx: AppContext,
  deps: AuthSetupContext,
  command: CompleteOnboardingCommand,
): Promise<Result<CompleteOnboardingResult, DomainError>> {
  if (
    command.method !== "none" &&
    command.enrollment.userId !== ctx.actor.userId
  ) {
    return Err(fail("invalid_input"));
  }

  const completedAt = ctx.now();

  return deps.uow.run(async (repos) => {
    const user = await repos.users.findByIdForUpdate(ctx.actor.userId);

    if (!user) {
      return Err(fail("user_not_found"));
    }

    if (user.onboarding_completed_at) {
      return Err(fail("invalid_input"));
    }

    if (user.password_change_required) {
      return Err(fail("installation_password_change_required"));
    }

    const strongAuthRequired = requiresStrongAuthRole(user.role);

    if (command.method === "none" && strongAuthRequired) {
      return Err(fail("strong_auth_required"));
    }

    const phoneAddress = await repos.userChannelAddresses.findByUserAndChannel(
      user.id,
      "whatsapp",
    );

    if (!phoneAddress || !parsePhone(phoneAddress.address)) {
      return Err(fail("invalid_phone"));
    }

    let recoveryCodes: string[] = [];
    let strongAuthMethod = ctx.actor.strongAuthMethod;
    let strongAuthAt = ctx.actor.strongAuthAt;

    switch (command.method) {
      case "none":
        break;

      case "passkey": {
        const persisted = await persistVerifiedPasskeyEnrollment(
          repos,
          command.enrollment,
          completedAt,
        );

        if (isErr(persisted)) {
          return persisted;
        }

        break;
      }

      case "totp": {
        const persisted = await persistVerifiedTotpEnrollment(
          repos,
          command.enrollment,
          completedAt,
        );

        if (isErr(persisted)) {
          return persisted;
        }

        break;
      }

      default:
        command satisfies never;
    }

    if (command.method !== "none") {
      strongAuthMethod = command.method;
      strongAuthAt = completedAt;
      recoveryCodes = await issueRecoveryCodesForEnrollment(
        repos,
        user.id,
        completedAt,
      );
    }

    if (strongAuthRequired) {
      const strongAuth = await getStrongAuthStatus(user.id, repos);

      if (!strongAuth.hasVerifiedStrongAuth) {
        return Err(fail("strong_auth_required"));
      }
    }

    await repos.userChannelAddresses.upsert({
      user_id: user.id,
      channel: "email",
      address: user.email,
      is_verified: true,
      verified_at: completedAt,
      created_at: completedAt,
      updated_at: completedAt,
    });

    await repos.users.completeOnboarding(user.id, { completedAt });

    await repos.events.append({
      type: "onboarding_completed",
      entityType: "user",
      entityId: auditEntityId("user", user.id),
      actorUserId: user.id,
      occurredAt: completedAt,
    });

    const sessionToken = await replaceSession(repos, {
      current: ctx.actor,
      user: {
        ...user,
        onboarding_completed_at: completedAt,
      },
      sessionClass: resolveSessionClass({
        onboardingCompleted: true,
        recoveryCodesAcknowledgementRequired: recoveryCodes.length > 0,
      }),
      strongAuthMethod,
      strongAuthAt,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      issuedAt: completedAt,
    });

    return Ok({
      redirectTo: getDefaultAppPath(user.role),
      recoveryCodes,
      sessionToken,
    });
  });
}
