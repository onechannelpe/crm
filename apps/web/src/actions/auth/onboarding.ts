"use server";

import {
  conflictError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import {
  getStrongAuthStatus,
  requiresStrongAuth,
} from "~/lib/auth/security/strong-auth-status";
import { repos } from "~/server/shared/context";

function assertE164Phone(value: string): string {
  const normalized = value.replace(/\s+/g, "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw validationError("phone must be a valid E.164 number");
  }
  return normalized;
}

export async function completeOnboarding(phoneE164: string): Promise<void> {
  const session = await requireSession();
  const user = await repos.users.findById(session.userId);

  if (!user) {
    throw notFoundError("User not found");
  }

  if (user.onboarding_completed_at) {
    return;
  }

  const strongAuthStatus = await getStrongAuthStatus(user.id, repos);
  if (requiresStrongAuth(user) && !strongAuthStatus.hasVerifiedStrongAuth) {
    throw conflictError("Strong authentication setup required");
  }

  const now = Date.now();
  const safePhone = assertE164Phone(phoneE164);

  await repos.users.completeOnboarding(user.id, {
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
