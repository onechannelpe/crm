"use server";

import { renderInviteEmail } from "@crm/notifications";
import { getRequestEvent } from "solid-js/web";

import type { Role } from "~/lib/auth/access/rbac";
import { serverRuntime } from "~/server/runtime";

export function buildInviteUrl(token: string): string {
  const event = getRequestEvent();
  const requestUrl = event?.request.url;
  if (!requestUrl) {
    return `/auth/invite/${token}`;
  }
  const origin = new URL(requestUrl).origin;
  return `${origin}/auth/invite/${token}`;
}

export async function sendInviteEmail(params: {
  email: string;
  fullName: string;
  role: Role;
  inviteUrl: string;
  expiresAt: number;
}): Promise<void> {
  const { html, text } = renderInviteEmail({
    fullName: params.fullName,
    role: params.role,
    inviteUrl: params.inviteUrl,
    expiresAt: new Date(params.expiresAt).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });
  await serverRuntime.notifications.notificationSender.send({
    channel: "email",
    to: params.email,
    subject: "Activa tu acceso al CRM",
    html,
    text,
  });
}
