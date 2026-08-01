import "server-only";
import type { UserId } from "~/domain/ids";
import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
import type { AuthAnalyticsRecorder } from "~/server/auth/auth-analytics";
import { createAdminSessionRevocationContext } from "~/server/auth/infrastructure/admin-session-revocation-context";
import { createAdminSessionsReadContext } from "~/server/auth/infrastructure/admin-sessions-read-context";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { createPasswordResetContext } from "~/server/auth/infrastructure/password-reset-context";
import {
  createAuthSessionLogoutContext,
  createAuthSessionReadContext,
} from "~/server/auth/infrastructure/session-context";
import { createAuthSessionRepo } from "~/server/auth/infrastructure/session-repo";
import { createAuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import { createAuthUsersRepo } from "~/server/auth/infrastructure/users-repo";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import {
  startImpersonation,
  stopImpersonation,
} from "~/server/auth/session/impersonation";
import { createSessionService } from "~/server/auth/session/session.service";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import { createInviteServiceForExecutor } from "~/server/invites/infrastructure/invite-service-factory";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import type { NotificationIntent } from "~/server/notifications/types";
import { composeNotifications } from "~/server/notifications/ui/composition";
import { composeObservability } from "~/server/observability/ui/composition";
import type { AppContext } from "~/server/platform/action/context";
import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import { createUsersRepo } from "~/server/users/repos-users";

function createAuthComposition(
  serverInfrastructure: ServerInfrastructure,
  notifications: {
    messaging: MessagingGateway;
    enqueue(intents: NotificationIntent[], now?: Date): Promise<void>;
  },
  analytics: AuthAnalyticsRecorder,
) {
  const sessionService = createSessionService({
    sessions: createAuthSessionRepo(serverInfrastructure.db),
    users: createAuthUsersRepo(serverInfrastructure.db),
    events: createEventsRepo(serverInfrastructure.db),
    now: serverInfrastructure.now,
    logger: serverInfrastructure.logger,
  });

  const authThrottleService = createAuthThrottleService({
    authThrottle: createAuthThrottleRepo(serverInfrastructure.db),
    now: serverInfrastructure.now,
  });
  const setup = createAuthSetupContext(serverInfrastructure.db);
  const inviteService = createInviteServiceForExecutor(
    serverInfrastructure.db,
    serverInfrastructure.now,
  );

  const impersonationDeps = {
    sessions: sessionService,
    users: createUsersRepo(serverInfrastructure.db),
    events: createEventsRepo(serverInfrastructure.db),
  };

  return {
    authThrottleService,
    analytics,
    sessionService,
    impersonation: {
      start: (ctx: AppContext, command: { userId: UserId }) =>
        startImpersonation(ctx, impersonationDeps, command),
      stop: (ctx: AppContext) => stopImpersonation(ctx, impersonationDeps),
    },
    login: createAuthLoginContext(
      serverInfrastructure.db,
      serverInfrastructure.now,
    ),
    setup,
    inviteAcceptance: {
      inviteService,
      repos: {
        users: setup.repos.users,
        sessions: setup.repos.sessions,
        events: setup.repos.events,
      },
    },
    passwordReset: createPasswordResetContext({
      executor: serverInfrastructure.db,
      messaging: notifications.messaging,
    }),
    sessionRead: createAuthSessionReadContext(serverInfrastructure.db),
    sessionLogout: createAuthSessionLogoutContext({
      executor: serverInfrastructure.db,
      revokeSession: (id) => sessionService.revoke(id),
    }),
    adminSessionsRead: createAdminSessionsReadContext(serverInfrastructure.db),
    adminSessionRevocation: createAdminSessionRevocationContext({
      executor: serverInfrastructure.db,
      revokeSession: (id) => sessionService.revoke(id),
      revokeUserSessions: (userId) => sessionService.revokeAllForUser(userId),
    }),
  };
}

export function composeAuth() {
  return createAuthComposition(
    defaultServerInfrastructure,
    composeNotifications(),
    composeObservability().observabilityService,
  );
}
