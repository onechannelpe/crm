export function formatWhatsAppNotificationBody(
  delivery: { body_text: string; action_url: string | null },
  publicOrigin: string,
): string {
  if (delivery.action_url === null) {
    return delivery.body_text;
  }
  const actionUrl = new URL(delivery.action_url, publicOrigin).toString();
  return `${delivery.body_text} Revísalo en: ${actionUrl}`;
}
