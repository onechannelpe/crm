import type { createNotificationContactRepo } from "~/server/notifications/repos/contact";
import type { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import type { UserId, LeadId, BranchId } from "~/server/shared/ids";

type NotificationBootstrapRepos = {
  notificationContacts: ReturnType<typeof createNotificationContactRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferenceRepo>;
};

async function provisionNotificationContacts(params: {
  userId: UserId;
  email: string;
  phoneE164: string;
  now: number;
  repos: Pick<NotificationBootstrapRepos, "notificationContacts">;
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

function enableDefaultNotificationPreferences(
  userId: UserId,
  now: number,
  repos: Pick<NotificationBootstrapRepos, "notificationPreferences">,
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

export async function bootstrapUserNotifications(
  params: {
    userId: UserId;
    email: string;
    phoneE164: string;
    now: number;
  },
  repos: NotificationBootstrapRepos,
) {
  await provisionNotificationContacts({
    userId: params.userId,
    email: params.email,
    phoneE164: params.phoneE164,
    now: params.now,
    repos,
  });
  await enableDefaultNotificationPreferences(params.userId, params.now, repos);
}
