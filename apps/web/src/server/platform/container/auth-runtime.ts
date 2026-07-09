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
import { createSessionService } from "~/server/auth/session/session.service";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import type { NotificationIntent } from "~/server/notifications/types";
import { createEventsRepo } from "~/server/shared/repos-events";

import type { ServerInfra } from "./infra";

export function createAuthRuntime(
  infra: ServerInfra,
  notifications: {
    messaging: MessagingGateway;
    enqueue(intents: NotificationIntent[], now?: Date): Promise<void>;
  },
) {
  const sessionService = createSessionService({
    sessions: createAuthSessionRepo(infra.db),
    users: createAuthUsersRepo(infra.db),
    events: createEventsRepo(infra.db),
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
    }),
    onboarding,
    inviteAcceptance: {
      inviteService,
      repos: {
        users: onboarding.repos.users,
        sessions: onboarding.repos.sessions,
        events: onboarding.repos.events,
      },
    },
    totp: createTotpEnrollmentContext(infra.db),
    passwordReset: createPasswordResetContext({
      executor: infra.db,
      messaging: notifications.messaging,
    }),
    sessionRead: createAuthSessionReadContext({
      executor: infra.db,
      revokeSession: (id) => sessionService.revoke(id),
    }),
    sessionLogout: createAuthSessionLogoutContext({
      executor: infra.db,
      revokeSession: (id) => sessionService.revoke(id),
    }),
    adminSessionsRead: createAdminSessionsReadContext(infra.db),
    adminSessionRevocation: createAdminSessionRevocationContext({
      executor: infra.db,
      revokeSession: (id) => sessionService.revoke(id),
      revokeUserSessions: (userId) => sessionService.revokeAllForUser(userId),
    }),
  };
}
