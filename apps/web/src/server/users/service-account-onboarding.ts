import type { Role } from "~/lib/auth/access/rbac";
import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "~/lib/auth/security/strong-auth-status";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

type OnboardingRepos = Pick<
  Repositories,
  | "users"
  | "passkeys"
  | "userTotpFactors"
  | "notificationContacts"
  | "notificationPreferences"
>;

type CompleteOnboardingError =
  | { reason: "user_not_found"; message: string }
  | { reason: "strong_auth_required"; message: string }
  | { reason: "unexpected"; message: string };

export interface AccountOnboardingDeps {
  now?: () => number;
  runInTransaction?: <T>(
    operation: (repos: OnboardingRepos) => Promise<T>,
  ) => Promise<T>;
}

function enableDefaultNotificationPreferences(
  userId: number,
  now: number,
  repos: Pick<OnboardingRepos, "notificationPreferences">,
) {
  return Promise.all([
    repos.notificationPreferences.upsert({
      user_id: userId,
      event_type: "security.privileged_login",
      channel: "email",
      is_enabled: 1,
      created_at: now,
      updated_at: now,
    }),
    repos.notificationPreferences.upsert({
      user_id: userId,
      event_type: "security.privileged_login",
      channel: "whatsapp",
      is_enabled: 1,
      created_at: now,
      updated_at: now,
    }),
    repos.notificationPreferences.upsert({
      user_id: userId,
      event_type: "broadcast.general",
      channel: "email",
      is_enabled: 1,
      created_at: now,
      updated_at: now,
    }),
    repos.notificationPreferences.upsert({
      user_id: userId,
      event_type: "broadcast.general",
      channel: "whatsapp",
      is_enabled: 1,
      created_at: now,
      updated_at: now,
    }),
  ]);
}

async function provisionNotificationContacts(params: {
  userId: number;
  email: string;
  phoneE164: string;
  now: number;
  repos: Pick<OnboardingRepos, "notificationContacts">;
}) {
  const { userId, email, phoneE164, now, repos } = params;
  await Promise.all([
    repos.notificationContacts.upsertPrimary({
      user_id: userId,
      channel: "email",
      address: email,
      is_primary: 1,
      is_verified: 1,
      verified_at: now,
      created_at: now,
      updated_at: now,
    }),
    repos.notificationContacts.upsertPrimary({
      user_id: userId,
      channel: "whatsapp",
      address: phoneE164,
      is_primary: 1,
      is_verified: 0,
      verified_at: null,
      created_at: now,
      updated_at: now,
    }),
  ]);
}

export function createAccountOnboardingService(
  repos: OnboardingRepos,
  deps: AccountOnboardingDeps = {},
) {
  const now = deps.now ?? Date.now;
  const runInTransaction =
    deps.runInTransaction ??
    (async <T>(operation: (transactionRepos: OnboardingRepos) => Promise<T>) =>
      operation(repos));

  return {
    async completeOnboarding(input: {
      userId: number;
      phoneE164: string;
    }): Promise<Result<void, CompleteOnboardingError>> {
      try {
        return await runInTransaction(async (transactionRepos) => {
          const user = await transactionRepos.users.findById(input.userId);
          if (!user) {
            return Err({
              reason: "user_not_found",
              message: "User not found",
            });
          }

          if (user.onboarding_completed_at !== null) {
            return Ok(undefined);
          }

          const strongAuthStatus = await getStrongAuthStatus(
            user.id,
            transactionRepos,
          );
          if (
            requiresStrongAuthRole(user.role as Role) &&
            !strongAuthStatus.hasVerifiedStrongAuth
          ) {
            return Err({
              reason: "strong_auth_required",
              message: "Strong authentication setup required",
            });
          }

          const completedAt = now();
          await transactionRepos.users.completeOnboarding(user.id, {
            phone_e164: input.phoneE164,
            completedAt,
          });
          await provisionNotificationContacts({
            userId: user.id,
            email: user.email,
            phoneE164: input.phoneE164,
            now: completedAt,
            repos: transactionRepos,
          });
          await enableDefaultNotificationPreferences(
            user.id,
            completedAt,
            transactionRepos,
          );
          return Ok(undefined);
        });
      } catch {
        return Err({
          reason: "unexpected",
          message: "Unexpected onboarding completion failure",
        });
      }
    },
  };
}
