export type NotificationChannelPreference = {
  channel: "email" | "whatsapp";
  controllable: boolean;
  available: boolean;
  enabled: boolean;
};

export type NotificationChannelAvailability = {
  channel: "email" | "whatsapp";
  available: boolean;
};

export type NotificationCategoryPreference = {
  category: "lead_handoffs" | "fulfillment" | "security" | "broadcasts";
  label: string;
  description: string;
  channels: NotificationChannelPreference[];
};

export type NotificationPreferencesView = {
  channels: NotificationChannelAvailability[];
  categories: NotificationCategoryPreference[];
};
