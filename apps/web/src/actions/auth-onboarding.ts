"use server";

import { requireSession } from "~/lib/auth/access/session";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

function assertE164Phone(value: string): string {
  const normalized = value.replace(/\s+/g, "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("phone must be a valid E.164 number");
  }
  return normalized;
}

export async function completeOnboarding(
  fullName: string,
  phoneE164: string,
): Promise<void> {
  const session = await requireSession();
  const user = await repos.users.findById(session.userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.onboarding_completed_at) {
    return;
  }

  const now = Date.now();
  const safeName = assertNonEmptyString(fullName, "fullName");
  const safePhone = assertE164Phone(phoneE164);

  await repos.users.completeOnboarding(user.id, {
    full_name: safeName,
    phone_e164: safePhone,
    completedAt: now,
  });

  await repos.notificationContacts.upsertPrimary({
    user_id: user.id,
    channel: "email",
    address: user.email,
    is_primary: 1,
    is_verified: 1,
    verified_at: now,
    created_at: now,
    updated_at: now,
  });

  await repos.notificationContacts.upsertPrimary({
    user_id: user.id,
    channel: "whatsapp",
    address: safePhone,
    is_primary: 1,
    is_verified: 1,
    verified_at: now,
    created_at: now,
    updated_at: now,
  });

  await repos.notificationPreferences.upsert({
    user_id: user.id,
    event_type: "security.privileged_login",
    channel: "email",
    is_enabled: 1,
    created_at: now,
    updated_at: now,
  });

  await repos.notificationPreferences.upsert({
    user_id: user.id,
    event_type: "security.privileged_login",
    channel: "whatsapp",
    is_enabled: 1,
    created_at: now,
    updated_at: now,
  });

  await repos.notificationPreferences.upsert({
    user_id: user.id,
    event_type: "broadcast.general",
    channel: "email",
    is_enabled: 1,
    created_at: now,
    updated_at: now,
  });

  await repos.notificationPreferences.upsert({
    user_id: user.id,
    event_type: "broadcast.general",
    channel: "whatsapp",
    is_enabled: 1,
    created_at: now,
    updated_at: now,
  });
}
