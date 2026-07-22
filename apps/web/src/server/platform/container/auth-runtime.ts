import { createAuthThrottleService } from "~/server/auth/application/throttle-service";
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
import { createInviteServiceForExecutor } from "~/server/invites/infrastructure/invite-service-factory";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import type { NotificationIntent } from "~/server/notifications/types";
import type { AppContext } from "~/server/platform/action/context";
import type { UserId } from "~/server/shared/ids";
import { createEventsRepo } from "~/server/shared/repos-events";
import { createUsersRepo } from "~/server/users/repos-users";

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
  const setup = createAuthSetupContext(infra.db);
  const inviteService = createInviteServiceForExecutor(infra.db, infra.now);

  const impersonationDeps = {
    sessions: sessionService,
    users: createUsersRepo(infra.db),
    events: createEventsRepo(infra.db),
  };

  return {
    authThrottleService,
    sessionService,
    impersonation: {
      start: (ctx: AppContext, command: { userId: UserId }) =>
        startImpersonation(ctx, impersonationDeps, command),
      stop: (ctx: AppContext) => stopImpersonation(ctx, impersonationDeps),
    },
    login: createAuthLoginContext(infra.db, infra.now),
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
