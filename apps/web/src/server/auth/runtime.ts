import "server-only";
import { auditEntityId } from "~/domain/audit/entity";
import { fail } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { countActiveSessions } from "~/server/auth/application/queries/count-active-sessions";
import { getCurrentUser } from "~/server/auth/application/queries/get-current-user";
import { getLoginFlowState } from "~/server/auth/application/queries/get-login-flow-state";
import { listAllActiveSessions } from "~/server/auth/application/queries/list-all-active-sessions";
import {
  recordAuthAnalyticsEvent,
  type AuthAnalyticsRecorder,
} from "~/server/auth/auth-analytics";
import {
  verifyPasskeyEnrollment,
  verifyPasskeyLogin,
} from "~/server/auth/factors/passkey/service";
import { verifyTotpEnrollment } from "~/server/auth/factors/totp-enrollment";
import { changeInstallationPassword } from "~/server/auth/flows/change-installation-password";
import { completeFactorEnrollment } from "~/server/auth/flows/complete-factor-enrollment";
import { completePendingLogin } from "~/server/auth/flows/complete-pending-login";
import { completeGoogleOAuthCallback } from "~/server/auth/flows/google-callback-login";
import { logoutUser } from "~/server/auth/flows/logout-user";
import { requestPasswordReset } from "~/server/auth/flows/request-password-reset";
import { resetPassword } from "~/server/auth/flows/reset-password";
import { revokeAllUserSessions } from "~/server/auth/flows/revoke-all-user-sessions";
import { revokeUserSession } from "~/server/auth/flows/revoke-user-session";
import { startPasskeyEnrollment } from "~/server/auth/flows/start-passkey-enrollment";
import { startPasskeyLogin } from "~/server/auth/flows/start-passkey-login";
import { startTotpEnrollment } from "~/server/auth/flows/start-totp-enrollment";
import { submitInviteAcceptance } from "~/server/auth/flows/submit-invite-acceptance";
import { submitPasswordLogin } from "~/server/auth/flows/submit-password-login";
import {
  verifyRecoveryLoginProof,
  verifyTotpLoginProof,
} from "~/server/auth/flows/verify-pending-login";
import { createAdminSessionRevocationContext } from "~/server/auth/infrastructure/admin-session-revocation-context";
import { createAdminSessionsReadContext } from "~/server/auth/infrastructure/admin-sessions-read-context";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { createPasswordResetContext } from "~/server/auth/infrastructure/password-reset-context";
import { createPasskeyProviderForOrigin } from "~/server/auth/infrastructure/request-passkey-provider";
import {
  createAuthSessionLogoutContext,
  createAuthSessionReadContext,
} from "~/server/auth/infrastructure/session-context";
import { createAuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import { completeOnboarding } from "~/server/auth/onboarding/complete";
import { saveOnboardingProfile } from "~/server/auth/onboarding/save-profile";
import { loadOnboardingSnapshot } from "~/server/auth/onboarding/snapshot";
import { hashPassword, verifyPassword } from "~/server/auth/password/password";
import {
  acknowledgeRecoverySetup,
  regenerateRecoverySetup,
} from "~/server/auth/recovery/recovery-setup";
import { canRemoveStrongAuthFactor } from "~/server/auth/security/factor-management-policy";
import { getStrongAuthStatus } from "~/server/auth/security/strong-auth-status";
import {
  startImpersonation,
  stopImpersonation,
} from "~/server/auth/session/impersonation";
import { createSessionService } from "~/server/auth/session/session.service";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import { createInviteServiceForExecutor } from "~/server/invites/infrastructure/invite-service-factory";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import type { AppContext } from "~/server/platform/action/context";
import type { ServerInfrastructure } from "~/server/platform/infrastructure";
import type { OperationContext } from "~/server/platform/operation/context";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createUsersRepo } from "~/server/users/repos-users";
import { Err, Ok } from "~/shared/result";

export function createAuthRuntime(
  serverInfrastructure: ServerInfrastructure,
  notifications: {
    messaging: MessagingGateway;
  },
  analytics: AuthAnalyticsRecorder,
) {
  const sessionService = createSessionService({
    sessions: createSessionRepository(serverInfrastructure.db),
    users: createUsersRepo(serverInfrastructure.db),
    events: createEventsRepo(serverInfrastructure.db),
    logger: serverInfrastructure.logger,
  });

  const setup = createAuthSetupContext(serverInfrastructure.db);
  const inviteService = createInviteServiceForExecutor(serverInfrastructure.db);

  const impersonationDeps = {
    sessions: sessionService,
    users: createUsersRepo(serverInfrastructure.db),
    events: createEventsRepo(serverInfrastructure.db),
  };
  const login = createAuthLoginContext(serverInfrastructure.db);
  const sessionRead = createAuthSessionReadContext(serverInfrastructure.db);
  const sessionLogout = createAuthSessionLogoutContext({
    executor: serverInfrastructure.db,
    revokeSession: (id) => sessionService.revoke(id),
  });
  const adminSessionsRead = createAdminSessionsReadContext(
    serverInfrastructure.db,
  );
  const adminSessionRevocation = createAdminSessionRevocationContext({
    executor: serverInfrastructure.db,
    revokeSession: (id) => sessionService.revoke(id),
    revokeUserSessions: (userId) => sessionService.revokeAllForUser(userId),
  });
  const passwordReset = createPasswordResetContext({
    executor: serverInfrastructure.db,
    messaging: notifications.messaging,
  });
  const loadAccountSecurityState = async (userId: UserId) => {
    const user = await setup.repos.users.findById(userId);
    if (!user) return Err(fail("user_not_found"));

    return Ok({
      user,
      strongAuthStatus: await getStrongAuthStatus(userId, setup.repos),
    });
  };

  const changeAccountPassword = async (
    userId: UserId,
    currentPassword: string,
    newPassword: string,
    changedAt: Date,
  ) => {
    const state = await loadAccountSecurityState(userId);
    if (!state.ok) return state;

    const valid = await verifyPassword(
      state.value.user.password_hash,
      currentPassword,
    );
    if (!valid) return Err(fail("current_password_incorrect"));

    await setup.repos.users.updatePassword(
      userId,
      await hashPassword(newPassword),
    );
    await setup.repos.events.append({
      type: "password_changed",
      entityType: "user",
      entityId: auditEntityId("user", userId),
      actorUserId: userId,
      occurredAt: changedAt,
    });
    return Ok({ message: "Contraseña actualizada" });
  };

  const removeAccountPasskeys = async (userId: UserId, removedAt: Date) => {
    const state = await loadAccountSecurityState(userId);
    if (!state.ok) return state;

    const { user, strongAuthStatus } = state.value;
    if (
      !canRemoveStrongAuthFactor({
        role: user.role,
        removingTotp: false,
        removingPasskeys: true,
        hasTotp: strongAuthStatus.hasTotp,
        hasPasskey: strongAuthStatus.hasPasskey,
      })
    ) {
      return Err(fail("strong_method_required"));
    }

    await setup.repos.passkeys.deleteAllByUser(userId);
    if (!strongAuthStatus.hasTotp)
      await setup.repos.userRecoveryCodes.deleteAllByUser(userId);
    await setup.repos.events.append({
      type: "passkeys_removed",
      entityType: "user",
      entityId: auditEntityId("user", userId),
      actorUserId: userId,
      occurredAt: removedAt,
    });
    return Ok({ message: "Claves de acceso eliminadas" });
  };

  const disableAccountTotp = async (userId: UserId, disabledAt: Date) => {
    const state = await loadAccountSecurityState(userId);
    if (!state.ok) return state;

    const { user, strongAuthStatus } = state.value;
    if (
      !canRemoveStrongAuthFactor({
        role: user.role,
        removingTotp: true,
        removingPasskeys: false,
        hasTotp: strongAuthStatus.hasTotp,
        hasPasskey: strongAuthStatus.hasPasskey,
      })
    ) {
      return Err(fail("strong_method_required"));
    }

    await setup.repos.userTotpFactors.disable(userId, disabledAt);
    if (!strongAuthStatus.hasPasskey)
      await setup.repos.userRecoveryCodes.deleteAllByUser(userId);
    await setup.repos.events.append({
      type: "totp_disabled",
      entityType: "user",
      entityId: auditEntityId("user", userId),
      actorUserId: userId,
      occurredAt: disabledAt,
    });
    return Ok({ message: "Aplicación de autenticación desactivada" });
  };

  return {
    login: {
      password: (
        input: Parameters<typeof submitPasswordLogin>[0],
        publicOrigin: string,
        operation: OperationContext,
      ) =>
        submitPasswordLogin(
          input,
          login,
          createPasskeyProviderForOrigin(login.repos, publicOrigin),
          operation,
        ),
      startPasskey: (
        input: Parameters<typeof startPasskeyLogin>[0],
        publicOrigin: string,
        operation: OperationContext,
      ) =>
        startPasskeyLogin(
          input,
          login,
          createPasskeyProviderForOrigin(login.repos, publicOrigin),
          operation,
        ),
      verifyTotp: (
        input: Parameters<typeof verifyTotpLoginProof>[1],
        operation: OperationContext,
      ) => verifyTotpLoginProof(login, input, operation),
      verifyRecovery: (
        input: Parameters<typeof verifyRecoveryLoginProof>[1],
        operation: OperationContext,
      ) => verifyRecoveryLoginProof(login, input, operation),
      verifyPasskey: (
        input: Omit<
          Parameters<typeof verifyPasskeyLogin>[1],
          "webauthnProvider"
        >,
        publicOrigin: string,
        operation: OperationContext,
      ) =>
        verifyPasskeyLogin(
          login.repos,
          {
            ...input,
            webauthnProvider: createPasskeyProviderForOrigin(
              login.repos,
              publicOrigin,
            ),
          },
          operation,
        ),
      complete: (
        input: Parameters<typeof completePendingLogin>[1],
        operation: OperationContext,
      ) => completePendingLogin(login, input, operation),
      completeGoogleOAuth: (
        input: Parameters<typeof completeGoogleOAuthCallback>[0],
        publicOrigin: string,
        operation: OperationContext,
      ) =>
        completeGoogleOAuthCallback(
          input,
          login,
          createPasskeyProviderForOrigin(login.repos, publicOrigin),
          operation,
        ),
      getFlow: (
        flowId: Parameters<typeof getLoginFlowState>[0],
        publicOrigin: string,
        operation: OperationContext,
      ) =>
        getLoginFlowState(
          flowId,
          login.repos,
          createPasskeyProviderForOrigin(login.repos, publicOrigin),
          operation,
        ),
    },
    analytics: (
      event: Parameters<typeof recordAuthAnalyticsEvent>[0],
      context: Parameters<typeof recordAuthAnalyticsEvent>[1],
      operation: OperationContext,
    ) => recordAuthAnalyticsEvent(event, context, analytics, operation),
    sessions: {
      resolve: (token: string, operation: OperationContext) =>
        sessionService.resolve(token, operation),
      invalidateUser: (userId: UserId) =>
        sessionService.revokeAllForUser(userId),
      currentUser: (ctx: AppContext) => getCurrentUser(ctx, sessionRead),
      logout: (ctx: AppContext) => logoutUser(ctx, sessionLogout),
      listForUser: (_ctx: AppContext, input: { userId: UserId }) =>
        adminSessionsRead.repos.sessions.listForUser(input.userId),
      countActive: (operation: OperationContext) =>
        countActiveSessions(adminSessionsRead, operation),
      listActive: (operation: OperationContext) =>
        listAllActiveSessions(adminSessionsRead, operation),
      revoke: (
        ctx: AppContext,
        input: Parameters<typeof revokeUserSession>[2],
      ) => revokeUserSession(ctx, adminSessionRevocation, input),
      revokeAll: (
        ctx: AppContext,
        input: Parameters<typeof revokeAllUserSessions>[2],
      ) => revokeAllUserSessions(ctx, adminSessionRevocation, input),
    },
    impersonation: {
      start: (ctx: AppContext, command: { userId: UserId }) =>
        startImpersonation(ctx, impersonationDeps, command),
      stop: (ctx: AppContext) => stopImpersonation(ctx, impersonationDeps),
    },
    security: {
      changePassword: changeAccountPassword,
      removePasskeys: removeAccountPasskeys,
      disableTotp: disableAccountTotp,
      startPasskeyEnrollment: (ctx: AppContext) =>
        startPasskeyEnrollment(setup, {
          userId: ctx.actor.userId,
          ipAddress: ctx.ipAddress,
          occurredAt: ctx.operationAt,
          webauthnProvider: createPasskeyProviderForOrigin(
            setup.repos,
            ctx.publicOrigin,
          ),
        }),
      finishPasskeyEnrollment: (
        ctx: AppContext,
        input: Omit<
          Parameters<typeof verifyPasskeyEnrollment>[2],
          "userId" | "ipAddress" | "verifiedAt"
        >,
      ) =>
        verifyPasskeyEnrollment(
          setup.repos,
          createPasskeyProviderForOrigin(setup.repos, ctx.publicOrigin),
          {
            ...input,
            userId: ctx.actor.userId,
            ipAddress: ctx.ipAddress,
            verifiedAt: ctx.operationAt,
          },
        ).then(async (verified) =>
          verified.ok
            ? completeFactorEnrollment(ctx, setup, {
                method: "passkey",
                enrollment: verified.value,
              })
            : verified,
        ),
      startTotpEnrollment: (ctx: AppContext) => startTotpEnrollment(ctx, setup),
      finishTotpEnrollment: (ctx: AppContext, code: string) =>
        verifyTotpEnrollment(setup.repos, {
          userId: ctx.actor.userId,
          code,
        }).then(async (verified) =>
          verified.ok
            ? completeFactorEnrollment(ctx, setup, {
                method: "totp",
                enrollment: verified.value,
              })
            : verified,
        ),
    },
    onboarding: {
      saveProfile: (
        ctx: AppContext,
        phone: Parameters<typeof saveOnboardingProfile>[1]["phone"],
      ) =>
        saveOnboardingProfile(setup, { userId: ctx.actor.userId, phone }, ctx),
      changePassword: (
        ctx: AppContext,
        input: Omit<
          Parameters<typeof changeInstallationPassword>[1],
          "userId" | "currentSessionId"
        >,
      ) =>
        changeInstallationPassword(
          setup,
          {
            ...input,
            userId: ctx.actor.userId,
            currentSessionId: ctx.actor.id,
          },
          ctx,
        ),
      snapshot: (userId: UserId) => loadOnboardingSnapshot(setup.repos, userId),
      completeWithoutFactor: (ctx: AppContext) =>
        completeOnboarding(ctx, setup, { method: "none" }),
      completeWithTotp: (ctx: AppContext, code: string) =>
        verifyTotpEnrollment(setup.repos, {
          userId: ctx.actor.userId,
          code,
        }).then(async (verified) =>
          verified.ok
            ? completeOnboarding(ctx, setup, {
                method: "totp",
                enrollment: verified.value,
              })
            : verified,
        ),
      completeWithPasskey: (
        ctx: AppContext,
        input: Omit<
          Parameters<typeof verifyPasskeyEnrollment>[2],
          "userId" | "ipAddress" | "verifiedAt"
        >,
      ) =>
        verifyPasskeyEnrollment(
          setup.repos,
          createPasskeyProviderForOrigin(setup.repos, ctx.publicOrigin),
          {
            ...input,
            userId: ctx.actor.userId,
            ipAddress: ctx.ipAddress,
            verifiedAt: ctx.operationAt,
          },
        ).then(async (verified) =>
          verified.ok
            ? completeOnboarding(ctx, setup, {
                method: "passkey",
                enrollment: verified.value,
              })
            : verified,
        ),
    },
    recoveryCodes: {
      regenerate: (ctx: AppContext) => regenerateRecoverySetup(ctx, setup),
      acknowledge: (ctx: AppContext) => acknowledgeRecoverySetup(ctx, setup),
      status: async (userId: UserId) => {
        const active = await setup.repos.userRecoveryCodes.getActiveSet(userId);
        return {
          hasActiveSet: active !== null,
          total: active?.total ?? 0,
          unused: active?.unused ?? 0,
          acknowledged: active?.acknowledgedAt != null,
        };
      },
    },
    passwordReset: {
      request: (
        input: Omit<Parameters<typeof requestPasswordReset>[0], "deps">,
        operation: OperationContext,
      ) => requestPasswordReset({ ...input, deps: passwordReset }, operation),
      reset: (
        input: Omit<Parameters<typeof resetPassword>[0], "deps">,
        operation: OperationContext,
      ) => resetPassword({ ...input, deps: passwordReset }, operation),
    },
    invites: {
      acceptPassword: (
        input: Parameters<typeof submitInviteAcceptance>[2],
        request: Parameters<typeof submitInviteAcceptance>[1],
        operation: OperationContext,
      ) =>
        submitInviteAcceptance(
          {
            inviteService,
            repos: {
              users: setup.repos.users,
              sessions: setup.repos.sessions,
              events: setup.repos.events,
            },
          },
          request,
          input,
          operation,
        ),
    },
    admin: {
      loginRetries: async (username: string, operation: OperationContext) => {
        const { users, authEvents } = login.repos;
        const user = await users.findByUsername(username);
        if (!user) return null;

        const since = operation.operationAt.getTime();
        const fifteenMinutesAgo = new Date(since - 15 * 60_000);
        const twentyFourHoursAgo = new Date(since - 24 * 60 * 60_000);
        const [retryCount15m, retryCount24h, recentRetries] = await Promise.all(
          [
            authEvents.countLoginRetriesSince(user.id, fifteenMinutesAgo),
            authEvents.countLoginRetriesSince(user.id, twentyFourHoursAgo),
            authEvents.findRecentLoginRetriesByUser(user.id, 25),
          ],
        );

        return { user, retryCount15m, retryCount24h, recentRetries };
      },
    },
  };
}
