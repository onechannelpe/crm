export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isErr<T, E>(
  result: Result<T, E>,
): result is { ok: false; error: E } {
  return !result.ok;
}

export const NOTIFICATION_CHANNELS = ["email", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const DELIVERY_PROVIDER_CHANNELS = {
  resend: "email",
  log: "email",
  kapso: "whatsapp",
  whatsapp_cloud: "whatsapp",
} as const satisfies Record<string, NotificationChannel>;

export type DeliveryProviderId = keyof typeof DELIVERY_PROVIDER_CHANNELS;
export const DELIVERY_PROVIDER_IDS = Object.keys(
  DELIVERY_PROVIDER_CHANNELS,
) as DeliveryProviderId[];

type ProviderForChannel<C extends NotificationChannel> = {
  [
    Provider in DeliveryProviderId
  ]: (typeof DELIVERY_PROVIDER_CHANNELS)[Provider] extends C ? Provider : never;
}[DeliveryProviderId];

export type NotificationRoutes = Partial<{
  [Channel in NotificationChannel]: ProviderForChannel<Channel>;
}>;

export function isNotificationChannel(
  value: string,
): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

export function isDeliveryProviderId(
  value: string,
): value is DeliveryProviderId {
  return value in DELIVERY_PROVIDER_CHANNELS;
}

export function deliveryProviderChannel(
  provider: DeliveryProviderId,
): NotificationChannel {
  return DELIVERY_PROVIDER_CHANNELS[provider];
}

export interface MessageChannelsConfig {
  routes: NotificationRoutes;
  providers: DeliveryProvider[];
}

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface OutboundWhatsAppText {
  to: string;
  body: string;
}

export interface DeliveryReceipt {
  channel: NotificationChannel;
  provider: DeliveryProviderId;
  providerMessageId: string | null;
}

export type DeliveryError =
  | {
      kind: "not_configured";
      channel: NotificationChannel;
      code: "missing_channel_config";
      message: string;
      retryable: false;
    }
  | {
      kind: "invalid_input";
      channel: NotificationChannel;
      code: "invalid_input";
      message: string;
      retryable: false;
    }
  | {
      kind: "provider_error";
      channel: NotificationChannel;
      provider: DeliveryProviderId;
      code: string;
      statusCode: number | null;
      message: string;
      retryable: boolean;
    };

type ProviderInput<C extends NotificationChannel> = C extends "email"
  ? OutboundEmail
  : OutboundWhatsAppText;

export interface DeliveryProvider<
  C extends NotificationChannel = NotificationChannel,
> {
  id: DeliveryProviderId;
  channel: C;
  send(input: ProviderInput<C>): Promise<{
    providerMessageId: string | null;
  }>;
}

export interface MessageChannels {
  sendEmail(
    input: OutboundEmail,
  ): Promise<Result<DeliveryReceipt, DeliveryError>>;
  sendWhatsAppText(
    input: OutboundWhatsAppText,
  ): Promise<Result<DeliveryReceipt, DeliveryError>>;
}
