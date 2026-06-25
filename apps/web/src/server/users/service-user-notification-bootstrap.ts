import type { Phone } from "~/lib/phone/pe-mobile";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

export type NotificationBootstrapPorts = {
  userChannelAddresses: {
    upsert(values: {
      user_id: number;
      channel: "email";
      address: string;
      is_verified: 1;
      verified_at: number;
      created_at: number;
      updated_at: number;
    }): Promise<unknown>;
    claimWhatsAppAddress(values: {
      userId: number;
      address: Phone;
      now: number;
    }): Promise<
      { kind: "claimed" } | { kind: "already_claimed"; ownerUserId: number }
    >;
  };
  notificationPreferences: {
    upsert(values: {
      user_id: number;
      event_type: "security.privileged_login" | "broadcast.general";
      channel: "email" | "whatsapp";
      is_enabled: 1;
      created_at: number;
      updated_at: number;
    }): Promise<unknown>;
  };
};

async function registerChannelAddresses(params: {
  userId: number;
  email: string;
  phone: Phone;
  now: number;
  repos: Pick<NotificationBootstrapPorts, "userChannelAddresses">;
}): Promise<
  Result<void, { code: "address_already_claimed"; ownerUserId: number }>
> {
  const { userId, email, phone, now, repos } = params;

  await repos.userChannelAddresses.upsert({
    user_id: userId,
    channel: "email",
    address: email,
    is_verified: 1,
    verified_at: now,
    created_at: now,
    updated_at: now,
  });

  const claimResult = await repos.userChannelAddresses.claimWhatsAppAddress({
    userId,
    address: phone,
    now,
  });
  if (claimResult.kind === "already_claimed") {
    return Err({
      code: "address_already_claimed",
      ownerUserId: claimResult.ownerUserId,
    });
  }

  return Ok(undefined);
}

function enableDefaultNotificationPreferences(
  userId: number,
  now: number,
  repos: Pick<NotificationBootstrapPorts, "notificationPreferences">,
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
    phone: Phone;
    now: number;
  },
  repos: NotificationBootstrapPorts,
): Promise<
  Result<void, { code: "address_already_claimed"; ownerUserId: number }>
> {
  const channelsResult = await registerChannelAddresses({
    userId: params.userId,
    email: params.email,
    phone: params.phone,
    now: params.now,
    repos,
  });
  if (isErr(channelsResult)) {
    return channelsResult;
  }
  await enableDefaultNotificationPreferences(params.userId, params.now, repos);
  return Ok(undefined);
}
