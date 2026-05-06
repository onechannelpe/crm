import type { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

type NotificationBootstrapRepos = {
  userChannelAddresses: ReturnType<typeof createUserChannelAddressRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferenceRepo>;
};

async function registerChannelAddresses(params: {
  userId: number;
  email: string;
  phoneE164: string;
  now: number;
  repos: Pick<NotificationBootstrapRepos, "userChannelAddresses">;
}): Promise<
  Result<void, { code: "address_already_claimed"; ownerUserId: number }>
> {
  const { userId, email, phoneE164, now, repos } = params;

  await repos.userChannelAddresses.upsert({
    user_id: userId,
    channel: "email",
    address: email,
    is_verified: 1,
    verified_at: now,
    created_at: now,
    updated_at: now,
  });

  const existingWhatsApp = await repos.userChannelAddresses.findByChannelAndAddress(
    "whatsapp",
    phoneE164,
  );
  if (existingWhatsApp && existingWhatsApp.user_id !== userId) {
    return Err({
      code: "address_already_claimed",
      ownerUserId: existingWhatsApp.user_id,
    });
  }

  await repos.userChannelAddresses.upsert({
    user_id: userId,
    channel: "whatsapp",
    address: phoneE164,
    is_verified: 0,
    verified_at: null,
    created_at: now,
    updated_at: now,
  });

  return Ok(undefined);
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
    email: string;
    phoneE164: string;
    now: number;
  },
  repos: NotificationBootstrapRepos,
): Promise<
  Result<void, { code: "address_already_claimed"; ownerUserId: number }>
> {
  const channelsResult = await registerChannelAddresses({
    userId: params.userId,
    email: params.email,
    phoneE164: params.phoneE164,
    now: params.now,
    repos: { userChannelAddresses: repos.userChannelAddresses },
  });
  if (isErr(channelsResult)) {
    return channelsResult;
  }
  await enableDefaultNotificationPreferences(params.userId, params.now, repos);
  return Ok(undefined);
}
