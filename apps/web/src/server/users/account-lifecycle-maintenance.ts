import { shortName } from "~/domain/identity/display-name";
import type { UserId } from "~/domain/ids";
import { formatAppLongDate } from "~/domain/time/app-time";
import { addMilliseconds } from "~/domain/time/clock";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { OperationContext } from "~/server/platform/operation/context";
import { PLATFORM_NAME } from "~/shared/branding";
import { createLogger } from "~/shared/observability/runtime-logger";

import { expireUsersAndInvalidateSessions } from "./expire-users";
import { createUsersRepo } from "./repos-users";

const logger = createLogger("account-lifecycle-maintenance");
const EXPIRY_NOTIFICATION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

interface AccountLifecycleDeps {
  executor: DatabaseExecutor;
  messaging: MessagingGateway;
  invalidateUserSessions: (userId: UserId) => Promise<void>;
}

export async function runAccountExpiryTick(
  deps: AccountLifecycleDeps,
  context: OperationContext,
) {
  const sweptAt = context.operationAt;
  try {
    const expiredCount = await expireUsersAndInvalidateSessions(sweptAt, {
      executor: deps.executor,
      invalidateUserSessions: deps.invalidateUserSessions,
    });
    if (expiredCount > 0) {
      logger.info("accounts_expired", { count: expiredCount });
    }
  } catch (error: unknown) {
    logger.error("account_expiry_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function runExpiryNotificationTick(
  users: ReturnType<typeof createUsersRepo>,
  messaging: MessagingGateway,
  context: OperationContext,
) {
  const sweptAt = context.operationAt;
  const threshold = addMilliseconds(sweptAt, EXPIRY_NOTIFICATION_THRESHOLD_MS);
  const expiringUsers = await users.findExpiringBefore(threshold);
  const outcomes = await Promise.all(
    expiringUsers.map(async (user) => {
      try {
        const claimed = await users.claimExpiryReminder(
          user.id,
          threshold,
          sweptAt,
        );
        if (!claimed || user.expires_at == null) {
          return false;
        }

        const sent = await messaging.sendAccountExpiringEmail({
          to: user.email,
          params: {
            fullName: shortName(user),
            username: user.username,
            expiresAt: formatAppLongDate(user.expires_at.getTime() - 1),
            platformName: PLATFORM_NAME,
          },
        });
        if (!sent.ok) {
          throw new Error(sent.error.message);
        }

        await users.markExpiryNotified(user.id, sweptAt);
        return true;
      } catch (error: unknown) {
        await users.releaseExpiryReminderClaim(user.id, sweptAt);
        logger.error("expiry_notification_send_failed", {
          userId: user.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return false;
      }
    }),
  );

  const sentCount = outcomes.filter(Boolean).length;

  if (sentCount > 0) {
    logger.info("expiry_notifications_sent", { count: sentCount });
  }
}

export function createAccountLifecycleMaintenance(deps: AccountLifecycleDeps) {
  const users = createUsersRepo(deps.executor);

  return {
    expireAccounts: (context: OperationContext) =>
      runAccountExpiryTick(deps, context),
    notifyExpiringAccounts: (context: OperationContext) =>
      runExpiryNotificationTick(users, deps.messaging, context),
  };
}
