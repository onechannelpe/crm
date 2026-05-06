import type { createNotificationChannelOwnerRepo } from "~/server/notifications/repos/channel-owner";
import type { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import { Err, Ok, type Result } from "~/server/shared/result";

type NotificationBootstrapRepos = {
  notificationChannelOwners: ReturnType<
    typeof createNotificationChannelOwnerRepo
  >;
  notificationPreferences: ReturnType<typeof createNotificationPreferenceRepo>;
};

async function provisionNotificationContacts(params: {
  userId: number;
  phoneE164: string;
  now: number;
  repos: Pick<NotificationBootstrapRepos, "notificationChannelOwners">;
}): Promise<
  Result<void, { code: "address_already_claimed"; ownerUserId: number }>
> {
  const { userId, phoneE164, now, repos } = params;

  const result = await repos.notificationChannelOwners.claimWhatsAppOwnership({
    user_id: userId,
    channel: "whatsapp",
    address_normalized: phoneE164,
    is_verified: 0,
    verified_at: null,
    created_at: now,
    updated_at: now,
  });

  if (result.kind === "already_claimed_by_other") {
    return Err({
      code: "address_already_claimed",
      ownerUserId: result.ownerUserId,
    });
  }
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
    phoneE164: string;
    now: number;
  },
  repos: NotificationBootstrapRepos,
): Promise<
  Result<void, { code: "address_already_claimed"; ownerUserId: number }>
> {
  const contactsResult = await provisionNotificationContacts({
    userId: params.userId,
    phoneE164: params.phoneE164,
    now: params.now,
    repos: {
      notificationChannelOwners: repos.notificationChannelOwners,
    },
  });
  if (contactsResult.ok === false) {
    return contactsResult;
  }
  await enableDefaultNotificationPreferences(params.userId, params.now, repos);
  return Ok(undefined);
}
