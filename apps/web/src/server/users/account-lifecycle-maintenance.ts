import { config } from "~/lib/config";
import { APP_LOCALE } from "~/lib/locale";
import { createLogger } from "~/lib/observability/logger";
import { shortName } from "~/lib/users/display-name";
import type { MessagingGateway } from "~/server/notifications/messaging-gateway";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { expireUsersAndInvalidateSessions } from "./expire-users";
import { createUsersRepo } from "./repos-users";

const logger = createLogger("account-lifecycle-maintenance");
const EXPIRY_NOTIFICATION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

interface AccountLifecycleDeps {
  executor: DatabaseExecutor;
  messaging: MessagingGateway;
  invalidateUserSessions: (userId: number) => Promise<void>;
}

async function runAccountExpiryTick(deps: AccountLifecycleDeps) {
  try {
    const expiredCount = await expireUsersAndInvalidateSessions(Date.now(), {
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

async function runExpiryNotificationTick(
  users: ReturnType<typeof createUsersRepo>,
  messaging: MessagingGateway,
) {
  const threshold = Date.now() + EXPIRY_NOTIFICATION_THRESHOLD_MS;
  const expiringUsers = await users.findExpiringBefore(threshold);
  const outcomes = await Promise.all(
    expiringUsers.map(async (user) => {
      const claimedAt = Date.now();
      try {
        const claimed = await users.claimExpiryReminder(
          user.id,
          threshold,
          claimedAt,
        );
        if (!claimed || user.expires_at == null) {
          return false;
        }

        const sent = await messaging.sendAccountExpiringEmail({
          to: user.email,
          params: {
            fullName: shortName(user),
            username: user.username,
            expiresAt: new Date(user.expires_at).toLocaleDateString(
              APP_LOCALE,
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            ),
            platformName: config.branding.platformName,
          },
        });
        if (!sent.ok) {
          throw new Error(sent.error.message);
        }

        await users.markExpiryNotified(user.id, Date.now());
        return true;
      } catch (error: unknown) {
        await users.releaseExpiryReminderClaim(user.id, claimedAt);
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

export function startAccountLifecycleMaintenance(deps: AccountLifecycleDeps) {
  const users = createUsersRepo(deps.executor);

  setInterval(() => {
    void runAccountExpiryTick(deps);
  }, 60_000);

  setInterval(
    () => {
      void runExpiryNotificationTick(users, deps.messaging);
    },
    24 * 60 * 60_000,
  );
}
