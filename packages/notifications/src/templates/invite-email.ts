import { html as template } from "./compiled/invite.js";

export interface InviteEmailParams {
  fullName: string;
  role: string;
  inviteUrl: string;
  /** Unix timestamp in milliseconds */
  expiresAt: number;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function renderInviteEmail(params: InviteEmailParams): {
  html: string;
  text: string;
} {
  const html = template
    .replaceAll("{{fullName}}", esc(params.fullName))
    .replaceAll("{{role}}", esc(params.role))
    .replaceAll("{{inviteUrl}}", esc(params.inviteUrl))
    .replaceAll("{{expiresAt}}", esc(formatDate(params.expiresAt)));

  const text = [
    `Hola ${params.fullName},`,
    "",
    `Se creó tu cuenta con el rol ${params.role}.`,
    `Activa tu acceso aquí: ${params.inviteUrl}`,
    `Este enlace vence el ${formatDate(params.expiresAt)}.`,
  ].join("\n");

  return { html, text };
}
