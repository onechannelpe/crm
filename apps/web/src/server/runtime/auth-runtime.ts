import { createAdminSessionRevocationContext } from "~/server/auth/infrastructure/admin-session-revocation-context";
import { createAdminSessionsReadContext } from "~/server/auth/infrastructure/admin-sessions-read-context";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { createAuthOnboardingContext } from "~/server/auth/infrastructure/onboarding-context";
import { createPasswordResetContext } from "~/server/auth/infrastructure/password-reset-context";
import {
  createAuthSessionLogoutContext,
  createAuthSessionReadContext,
} from "~/server/auth/infrastructure/session-context";
import { createTotpEnrollmentContext } from "~/server/auth/infrastructure/totp-context";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createSessionService } from "~/server/features/auth/application/session-service";
import { createAuthThrottleService } from "~/server/features/auth/application/throttle-service";
import { createAuthSessionRepo } from "~/server/features/auth/infra/session-repo";
import { createAuthUsersRepo } from "~/server/features/auth/infra/users-repo";

import type { NotificationService } from "@crm/notifications";

import type { ServerInfra } from "./infra";

export function createAuthRuntime(
  infra: ServerInfra,
  notificationSender: NotificationService,
) {
  const sessionService = createSessionService({
    sessions: createAuthSessionRepo(infra.db),
    users: createAuthUsersRepo(infra.db),
    now: infra.now,
    logger: infra.logger,
  });

  const authThrottleService = createAuthThrottleService({
    authThrottle: createAuthThrottleRepo(infra.db),
    now: infra.now,
  });

  return {
    authThrottleService,
    sessionService,
    login: createAuthLoginContext(infra.db),
    onboarding: createAuthOnboardingContext(infra.db),
    totp: createTotpEnrollmentContext(infra.db),
    passwordReset: createPasswordResetContext({
      executor: infra.db,
      notificationSender,
    }),
    sessionRead: createAuthSessionReadContext({
      executor: infra.db,
      invalidateSession: (id) => sessionService.invalidateSession(id),
    }),
    sessionLogout: createAuthSessionLogoutContext({
      executor: infra.db,
      invalidateSession: (id) => sessionService.invalidateSession(id),
    }),
    adminSessionsRead: createAdminSessionsReadContext(infra.db),
    adminSessionRevocation: createAdminSessionRevocationContext({
      executor: infra.db,
      invalidateSession: (id) => sessionService.invalidateSession(id),
      invalidateUserSessions: (userId) =>
        sessionService.invalidateUserSessions(userId),
    }),
  };
}
