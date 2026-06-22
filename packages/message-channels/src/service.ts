import { isProviderSendFailure } from "./channels/provider-types";
import {
  Err,
  Ok,
  deliveryProviderChannel,
  type DeliveryError,
  type DeliveryProvider,
  type DeliveryProviderId,
  type DeliveryReceipt,
  type MessageChannels,
  type MessageChannelsConfig,
  type NotificationChannel,
  type OutboundEmail,
  type OutboundWhatsAppText,
  type Result,
} from "./types";

type SendEmailResult = Result<DeliveryReceipt, DeliveryError>;
type SendWhatsAppResult = Result<DeliveryReceipt, DeliveryError>;
type ProviderRegistry = Partial<
  Record<DeliveryProviderId, DeliveryProvider<NotificationChannel>>
>;

function errFromInput(
  channel: NotificationChannel,
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
  channel: NotificationChannel,
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
  channel: NotificationChannel,
  failure: {
    provider: DeliveryProviderId;
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

function createProviderRegistry(
  providers: DeliveryProvider[],
): ProviderRegistry {
  const registry: ProviderRegistry = {};

  for (const provider of providers) {
    if (registry[provider.id]) {
      throw new Error(`Duplicate notification provider: ${provider.id}`);
    }
    registry[provider.id] = provider;
  }

  return registry;
}

function validateRoutes(
  config: MessageChannelsConfig,
  registry: ProviderRegistry,
): void {
  for (const [channel, providerId] of Object.entries(config.routes) as Array<
    [NotificationChannel, DeliveryProviderId]
  >) {
    const providerChannel = deliveryProviderChannel(providerId);
    if (providerChannel !== channel) {
      throw new Error(
        `Notification route ${channel}:${providerId} cannot use a ${providerChannel} provider`,
      );
    }

    const provider = registry[providerId];
    if (!provider) {
      throw new Error(
        `Notification route ${channel}:${providerId} references an unregistered provider`,
      );
    }

    if (provider.channel !== providerChannel) {
      throw new Error(
        `Notification provider ${providerId} registered for ${provider.channel}, expected ${providerChannel}`,
      );
    }
  }
}

function getProvider<C extends NotificationChannel>(
  channel: C,
  config: MessageChannelsConfig,
  registry: ProviderRegistry,
): DeliveryProvider<C> | null {
  const providerId = config.routes[channel];
  if (!providerId) {
    return null;
  }

  return (registry[providerId] as DeliveryProvider<C> | undefined) ?? null;
}

async function sendWithProvider<C extends NotificationChannel>(
  channel: C,
  provider: DeliveryProvider<C>,
  input: C extends "email" ? OutboundEmail : OutboundWhatsAppText,
): Promise<Result<DeliveryReceipt, DeliveryError>> {
  try {
    const receipt = await provider.send(input);
    return Ok({
      channel,
      provider: provider.id,
      providerMessageId: receipt.providerMessageId,
    });
  } catch (error) {
    if (isProviderSendFailure(error)) {
      return errFromProviderFailure(channel, error);
    }

    return errFromProviderFailure(channel, {
      provider: provider.id,
      code: "unknown_error",
      statusCode: null,
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: true,
    });
  }
}

async function sendEmail(
  config: MessageChannelsConfig,
  registry: ProviderRegistry,
  input: OutboundEmail,
): Promise<SendEmailResult> {
  const provider = getProvider("email", config, registry);
  if (!provider) {
    return errNotConfigured("email");
  }

  if (!input.to.trim()) {
    return errFromInput("email", "Email recipient is required");
  }

  if (!input.subject.trim()) {
    return errFromInput("email", "Email subject is required");
  }

  return sendWithProvider("email", provider, input);
}

async function sendWhatsAppText(
  config: MessageChannelsConfig,
  registry: ProviderRegistry,
  input: OutboundWhatsAppText,
): Promise<SendWhatsAppResult> {
  const provider = getProvider("whatsapp", config, registry);
  if (!provider) {
    return errNotConfigured("whatsapp");
  }

  if (!input.to.trim()) {
    return errFromInput("whatsapp", "WhatsApp recipient is required");
  }

  if (!input.body.trim()) {
    return errFromInput("whatsapp", "WhatsApp body is required");
  }

  return sendWithProvider("whatsapp", provider, input);
}

export function createMessageChannels(
  config: MessageChannelsConfig,
): MessageChannels {
  const registry = createProviderRegistry(config.providers);
  validateRoutes(config, registry);

  return {
    sendEmail(input) {
      return sendEmail(config, registry, input);
    },
    sendWhatsAppText(input) {
      return sendWhatsAppText(config, registry, input);
    },
  };
}
