type Composition = typeof import("~/server/notifications/ui/preferences");

export async function getNotificationPreferences(
  ...args: Parameters<Composition["getNotificationPreferences"]>
) {
  "use server";
  const { getNotificationPreferences: execute } =
    await import("~/server/notifications/ui/preferences");
  return execute(...args);
}

export async function setNotificationPreference(
  ...args: Parameters<Composition["setNotificationPreference"]>
) {
  "use server";
  const { setNotificationPreference: execute } =
    await import("~/server/notifications/ui/preferences");
  return execute(...args);
}
