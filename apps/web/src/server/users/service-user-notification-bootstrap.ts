import type { createNotificationContactRepo } from "~/server/notifications/repos/contact";
import type { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";

type NotificationBootstrapRepos = {
  notificationContacts: ReturnType<typeof createNotificationContactRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferenceRepo>;
};

async function provisionNotificationContacts(params: {
  userId: number;
  phoneE164: string;
  now: number;
  repos: Pick<NotificationBootstrapRepos, "notificationContacts">;
}) {
  const { userId, phoneE164, now, repos } = params;

  await repos.notificationContacts.claim({
    user_id: userId,
    channel: "whatsapp",
    address_normalized: phoneE164,
    is_verified: 0,
    verified_at: null,
    created_at: now,
    updated_at: now,
  });
}

function enableDefaultNotificationPreferences(
  userId: number,
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
    userId: number;
    phoneE164: string;
    now: number;
  },
  repos: NotificationBootstrapRepos,
) {
  await provisionNotificationContacts({
    userId: params.userId,
    phoneE164: params.phoneE164,
    now: params.now,
    repos,
  });
  await enableDefaultNotificationPreferences(params.userId, params.now, repos);
}
