import { createSessionService } from "~/server/auth/application/session-service";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import { createAdminSessionRevocationContext } from "~/server/auth/infrastructure/admin-session-revocation-context";
import { createAdminSessionsReadContext } from "~/server/auth/infrastructure/admin-sessions-read-context";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { createAuthOnboardingContext } from "~/server/auth/infrastructure/onboarding-context";
import { createPasswordResetContext } from "~/server/auth/infrastructure/password-reset-context";
import {
  createAuthSessionLogoutContext,
  createAuthSessionReadContext,
} from "~/server/auth/infrastructure/session-context";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createTotpEnrollmentContext } from "~/server/auth/infrastructure/totp-context";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";
import type { MessagingGateway } from "~/server/notifications/messaging-gateway";
import type { NotificationIntent } from "~/server/notifications/types";

import type { ServerInfra } from "./infra";

export function createAuthRuntime(
  infra: ServerInfra,
  notifications: {
    messaging: MessagingGateway;
    enqueue(intents: NotificationIntent[], now?: number): Promise<void>;
    dispatchPendingJobs(): Promise<void>;
  },
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
  const onboarding = createAuthOnboardingContext(infra.db);
  const inviteService = createInviteServiceContext(infra.db).inviteService;

  return {
    authThrottleService,
    sessionService,
    login: createAuthLoginContext(infra.db, {
      enqueue: (intents, now) => notifications.enqueue(intents, now),
      dispatchPendingJobs: () => notifications.dispatchPendingJobs(),
    }),
    onboarding,
    inviteAcceptance: {
      inviteService,
      repos: {
        users: onboarding.repos.users,
        sessions: onboarding.repos.sessions,
        auditLogs: onboarding.repos.auditLogs,
      },
    },
    totp: createTotpEnrollmentContext(infra.db),
    passwordReset: createPasswordResetContext({
      executor: infra.db,
      messaging: notifications.messaging,
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
