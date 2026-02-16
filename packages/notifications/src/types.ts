export interface NotificationsConfig {
  resendApiKey?: string;
  fromEmail?: string;
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappApiVersion?: string;
}

export type NotificationChannel = "email" | "whatsapp";

export interface NotificationSendInput {
  channel: NotificationChannel;
  to: string;
  subject?: string;
  text: string;
  html?: string;
}

export interface NotificationService {
  send(input: NotificationSendInput): Promise<void>;
}
