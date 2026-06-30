import type { Phone } from "~/lib/phone/pe-mobile";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

export type NotificationBootstrapPorts = {
  userChannelAddresses: {
    upsert(values: {
      user_id: UserId;
      channel: "email";
      address: string;
      is_verified: boolean;
      verified_at: Date;
      created_at: Date;
      updated_at: Date;
    }): Promise<unknown>;
    claimWhatsAppAddress(values: {
      userId: UserId;
      address: Phone;
      now: Date;
    }): Promise<
      { kind: "claimed" } | { kind: "already_claimed"; ownerUserId: UserId }
    >;
  };
  notificationPreferences: {
    upsert(values: {
      user_id: UserId;
      event_type: "security.privileged_login" | "broadcast.general";
      channel: "email" | "whatsapp";
      is_enabled: boolean;
      created_at: Date;
      updated_at: Date;
    }): Promise<unknown>;
  };
};

async function registerChannelAddresses(params: {
  userId: UserId;
  email: string;
  phone: Phone;
  now: Date;
  repos: Pick<NotificationBootstrapPorts, "userChannelAddresses">;
}): Promise<
  Result<void, { code: "address_already_claimed"; ownerUserId: UserId }>
> {
  const { userId, email, phone, now, repos } = params;

  await repos.userChannelAddresses.upsert({
    user_id: userId,
    channel: "email",
    address: email,
    is_verified: true,
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
  userId: UserId,
  now: Date,
  repos: Pick<NotificationBootstrapPorts, "notificationPreferences">,
) {
  return Promise.all([
    repos.notificationPreferences.upsert({
      user_id: userId,
      event_type: "security.privileged_login",
      channel: "email",
      is_enabled: true,
      created_at: now,
      updated_at: now,
    }),
    repos.notificationPreferences.upsert({
      user_id: userId,
      event_type: "security.privileged_login",
      channel: "whatsapp",
      is_enabled: true,
      created_at: now,
      updated_at: now,
    }),
    repos.notificationPreferences.upsert({
      user_id: userId,
      event_type: "broadcast.general",
      channel: "email",
      is_enabled: true,
      created_at: now,
      updated_at: now,
    }),
    repos.notificationPreferences.upsert({
      user_id: userId,
      event_type: "broadcast.general",
      channel: "whatsapp",
      is_enabled: true,
      created_at: now,
      updated_at: now,
    }),
  ]);
}

export async function bootstrapUserNotifications(
  params: {
    userId: UserId;
    email: string;
    phone: Phone;
    now: Date;
  },
  repos: NotificationBootstrapPorts,
): Promise<
  Result<void, { code: "address_already_claimed"; ownerUserId: UserId }>
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
