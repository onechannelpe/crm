import { sendWithResend } from "./channels/email/resend-client";
import { isProviderSendFailure } from "./channels/provider-types";
import { sendWithWhatsAppCloudText } from "./channels/whatsapp/meta-cloud";
import {
  Err,
  Ok,
  type DeliveryReceipt,
  type DeliveryError,
  type MessageChannels,
  type MessageChannelsConfig,
  type OutboundEmail,
  type OutboundWhatsAppText,
  type Result,
} from "./types";

type SendEmailResult = Result<DeliveryReceipt, DeliveryError>;
type SendWhatsAppResult = Result<DeliveryReceipt, DeliveryError>;

function getEmailConfig(config: MessageChannelsConfig): {
  resendApiKey: string;
  fromEmail: string;
} | null {
  if (!config.resendApiKey || !config.fromEmail) {
    return null;
  }
  return {
    resendApiKey: config.resendApiKey,
    fromEmail: config.fromEmail,
  };
}

function getWhatsAppConfig(config: MessageChannelsConfig): {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
} | null {
  if (
    !config.whatsappAccessToken ||
    !config.whatsappPhoneNumberId ||
    !config.whatsappApiVersion
  ) {
    return null;
  }
  return {
    accessToken: config.whatsappAccessToken,
    phoneNumberId: config.whatsappPhoneNumberId,
    apiVersion: config.whatsappApiVersion,
  };
}

function errFromInput(
  channel: "email" | "whatsapp",
  message: string,
): Result<never, DeliveryError> {
  return Err({
    kind: "invalid_input",
    channel,
    code: "invalid_input",
    message,
    retryable: false,
  });
}

function errNotConfigured(
  channel: "email" | "whatsapp",
): Result<never, DeliveryError> {
  return Err({
    kind: "not_configured",
    channel,
    code: "missing_channel_config",
    message:
      channel === "email"
        ? "Email channel is not configured"
        : "WhatsApp channel is not configured",
    retryable: false,
  });
}

function errFromProviderFailure(
  channel: "email" | "whatsapp",
  failure: {
    provider: "resend" | "whatsapp_cloud";
    code: string;
    statusCode: number | null;
    message: string;
    retryable: boolean;
  },
): Result<never, DeliveryError> {
  return Err({
    kind: "provider_error",
    channel,
    provider: failure.provider,
    code: failure.code,
    statusCode: failure.statusCode,
    message: failure.message,
    retryable: failure.retryable,
  });
}

async function sendEmail(
  config: MessageChannelsConfig,
  input: OutboundEmail,
): Promise<SendEmailResult> {
  const emailConfig = getEmailConfig(config);
  if (!emailConfig) {
    return errNotConfigured("email");
  }

  if (!input.to.trim()) {
    return errFromInput("email", "Email recipient is required");
  }

  if (!input.subject.trim()) {
    return errFromInput("email", "Email subject is required");
  }

  try {
    const receipt = await sendWithResend(emailConfig.resendApiKey, {
      from: emailConfig.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return Ok({
      channel: "email",
      provider: "resend",
      providerMessageId: receipt.providerMessageId,
    });
  } catch (error) {
    if (isProviderSendFailure(error)) {
      return errFromProviderFailure("email", error);
    }
    return errFromProviderFailure("email", {
      provider: "resend",
      code: "unknown_error",
      statusCode: null,
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: true,
    });
  }
}

async function sendWhatsAppText(
  config: MessageChannelsConfig,
  input: OutboundWhatsAppText,
): Promise<SendWhatsAppResult> {
  const whatsAppConfig = getWhatsAppConfig(config);
  if (!whatsAppConfig) {
    return errNotConfigured("whatsapp");
  }

  if (!input.to.trim()) {
    return errFromInput("whatsapp", "WhatsApp recipient is required");
  }

  if (!input.body.trim()) {
    return errFromInput("whatsapp", "WhatsApp body is required");
  }

  try {
    const receipt = await sendWithWhatsAppCloudText({
      accessToken: whatsAppConfig.accessToken,
      phoneNumberId: whatsAppConfig.phoneNumberId,
      apiVersion: whatsAppConfig.apiVersion,
      to: input.to,
      body: input.body,
    });
    return Ok({
      channel: "whatsapp",
      provider: "whatsapp_cloud",
      providerMessageId: receipt.providerMessageId,
    });
  } catch (error) {
    if (isProviderSendFailure(error)) {
      return errFromProviderFailure("whatsapp", error);
    }
    return errFromProviderFailure("whatsapp", {
      provider: "whatsapp_cloud",
      code: "unknown_error",
      statusCode: null,
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: true,
    });
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
