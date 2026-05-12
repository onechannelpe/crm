"use server";

import { getRequestEvent } from "solid-js/web";

import type { Role } from "~/lib/auth/access/rbac";
import { config } from "~/lib/config";
import { APP_LOCALE } from "~/lib/locale";
import { getServerRuntime } from "~/server/runtime";

export function buildInviteUrl(token: string): string {
  const path = `/login/invite/${encodeURIComponent(token)}`;
  const event = getRequestEvent();
  const requestUrl = event?.request.url;
  if (!requestUrl) {
    return path;
  }
  const origin = new URL(requestUrl).origin;
  return `${origin}${path}`;
}

export async function sendInviteEmail(params: {
  email: string;
  fullName: string;
  role: Role;
  inviteUrl: string;
  expiresAt: number;
}): Promise<void> {
  const sent = await getServerRuntime().notifications.messaging.sendInviteEmail(
    {
      to: params.email,
      params: {
        fullName: params.fullName,
        role: params.role,
        inviteUrl: params.inviteUrl,
        expiresAt: new Date(params.expiresAt).toLocaleDateString(APP_LOCALE, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        platformName: config.branding.platformName,
      },
    },
  );
  if (!sent.ok) {
    throw new Error(sent.error.message);
  }
}
