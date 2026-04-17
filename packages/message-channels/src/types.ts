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

export interface MessageChannelsConfig {
  resendApiKey?: string;
  fromEmail?: string;
  whatsappAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappApiVersion?: string;
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
  channel: "email" | "whatsapp";
  provider: "resend" | "whatsapp_cloud";
  providerMessageId: string | null;
}

export type DeliveryError =
  | {
      kind: "not_configured";
      channel: "email" | "whatsapp";
      code: "missing_channel_config";
      message: string;
      retryable: false;
    }
  | {
      kind: "invalid_input";
      channel: "email" | "whatsapp";
      code: "invalid_input";
      message: string;
      retryable: false;
    }
  | {
      kind: "provider_error";
      channel: "email" | "whatsapp";
      provider: "resend" | "whatsapp_cloud";
      code: string;
      statusCode: number | null;
      message: string;
      retryable: boolean;
    };

export interface MessageChannels {
  sendEmail(
    input: OutboundEmail,
  ): Promise<Result<DeliveryReceipt, DeliveryError>>;
  sendWhatsAppText(
    input: OutboundWhatsAppText,
  ): Promise<Result<DeliveryReceipt, DeliveryError>>;
}
