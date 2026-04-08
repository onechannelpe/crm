import { renderAccountExpiringEmail } from "@crm/notifications";

import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";
import { shortName } from "~/lib/users/display-name";
import { getNotificationRuntime } from "~/server/notifications/runtime";

import { expireUsersAndInvalidateSessions } from "./expire-users";
import { createUsersRepo } from "./repos-users";

const logger = createLogger("account-lifecycle-maintenance");
const EXPIRY_NOTIFICATION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
const users = createUsersRepo(db);
const { notificationSender } = getNotificationRuntime();

async function runAccountExpiryTick() {
  try {
    const expiredCount = await expireUsersAndInvalidateSessions(Date.now());
    if (expiredCount > 0) {
      logger.info("accounts_expired", { count: expiredCount });
    }
  } catch (error: unknown) {
    logger.error("account_expiry_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runExpiryNotificationTick() {
  const threshold = Date.now() + EXPIRY_NOTIFICATION_THRESHOLD_MS;
  const expiringUsers = await users.findExpiringBefore(threshold);
  let sentCount = 0;

  for (const user of expiringUsers) {
    const claimedAt = Date.now();
    try {
      // eslint-disable-next-line no-await-in-loop
      const claimed = await users.claimExpiryReminder(
        user.id,
        threshold,
        claimedAt,
      );
      if (!claimed) {
        continue;
      }

      const { html, text } = renderAccountExpiringEmail({
        fullName: shortName(user),
        username: user.username,
        expiresAt: new Date(user.expires_at!).toLocaleDateString("es-MX", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });

      // eslint-disable-next-line no-await-in-loop
      await notificationSender.send({
        channel: "email",
        to: user.email,
        subject: "Tu cuenta en One Channel vence pronto",
        html,
        text,
      });

      // eslint-disable-next-line no-await-in-loop
      await users.markExpiryNotified(user.id, Date.now());
      sentCount += 1;
    } catch (error: unknown) {
      // eslint-disable-next-line no-await-in-loop
      await users.releaseExpiryReminderClaim(user.id, claimedAt);
      logger.error("expiry_notification_send_failed", {
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (sentCount > 0) {
    logger.info("expiry_notifications_sent", { count: sentCount });
  }
}

export function startAccountLifecycleMaintenance() {
  setInterval(() => {
    void runAccountExpiryTick();
  }, 60_000);

  setInterval(
    () => {
      void runExpiryNotificationTick();
    },
    24 * 60 * 60_000,
  );
}
