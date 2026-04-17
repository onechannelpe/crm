import { sendWithResend } from "./channels/email/resend-client";
import { sendWithWhatsAppCloudText } from "./channels/whatsapp/meta-cloud";
import {
  Err,
  Ok,
  type DeliveryError,
  type MessageChannels,
  type MessageChannelsConfig,
  type OutboundEmail,
  type OutboundWhatsAppText,
  type Result,
} from "./types";

type SendEmailResult = Result<void, DeliveryError>;
type SendWhatsAppResult = Result<void, DeliveryError>;

function isEmailConfigured(config: MessageChannelsConfig): boolean {
  return Boolean(config.resendApiKey && config.fromEmail);
}

function isWhatsAppConfigured(config: MessageChannelsConfig): boolean {
  return Boolean(
    config.whatsappAccessToken &&
    config.whatsappPhoneNumberId &&
    config.whatsappApiVersion,
  );
}

function classifyRetryableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("429") ||
    normalized.includes("rate") ||
    normalized.includes("timeout") ||
    normalized.includes("temporar")
  );
}

function errFromInput(
  channel: "email" | "whatsapp",
  message: string,
): Result<never, DeliveryError> {
  return Err({
    kind: "invalid_input",
    channel,
    message,
    retryable: false,
  });
}

function errFromProvider(
  channel: "email" | "whatsapp",
  provider: "resend" | "whatsapp_cloud",
  message: string,
): Result<never, DeliveryError> {
  return Err({
    kind: "provider_error",
    channel,
    provider,
    message,
    retryable: classifyRetryableError(message),
  });
}

async function sendEmail(
  config: MessageChannelsConfig,
  input: OutboundEmail,
): Promise<SendEmailResult> {
  if (!isEmailConfigured(config)) {
    return Err({
      kind: "not_configured",
      channel: "email",
      message: "Email channel is not configured",
      retryable: false,
    });
  }

  if (!input.to.trim()) {
    return errFromInput("email", "Email recipient is required");
  }

  if (!input.subject.trim()) {
    return errFromInput("email", "Email subject is required");
  }

  try {
    await sendWithResend(config.resendApiKey!, {
      from: config.fromEmail!,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return Ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errFromProvider("email", "resend", message);
  }
}

async function sendWhatsAppText(
  config: MessageChannelsConfig,
  input: OutboundWhatsAppText,
): Promise<SendWhatsAppResult> {
  if (!isWhatsAppConfigured(config)) {
    return Err({
      kind: "not_configured",
      channel: "whatsapp",
      message: "WhatsApp channel is not configured",
      retryable: false,
    });
  }

  if (!input.to.trim()) {
    return errFromInput("whatsapp", "WhatsApp recipient is required");
  }

  if (!input.body.trim()) {
    return errFromInput("whatsapp", "WhatsApp body is required");
  }

  try {
    await sendWithWhatsAppCloudText({
      accessToken: config.whatsappAccessToken!,
      phoneNumberId: config.whatsappPhoneNumberId!,
      apiVersion: config.whatsappApiVersion!,
      to: input.to,
      body: input.body,
    });
    return Ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errFromProvider("whatsapp", "whatsapp_cloud", message);
  }
}

export function createMessageChannels(
  config: MessageChannelsConfig,
): MessageChannels {
  return {
    sendEmail(input) {
      return sendEmail(config, input);
    },
    sendWhatsAppText(input) {
      return sendWhatsAppText(config, input);
    },
  };
}
