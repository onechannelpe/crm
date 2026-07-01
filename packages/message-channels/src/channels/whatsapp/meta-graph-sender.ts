import type { DeliveryProviderId } from "../../types";
import type {
  ProviderSendFailure,
  ProviderSendResult,
} from "../provider-types";

// Kapso is a proxy over the same Meta Graph WhatsApp API shape that
// whatsapp_cloud (meta-cloud.ts) talks to directly — this is the one shared
// implementation of that shape. Each provider file supplies only what
// genuinely differs: base URL, auth header, and provider id.
export interface MetaGraphWhatsAppConfig {
  providerId: DeliveryProviderId;
  baseUrl: string;
  apiVersion: string;
  phoneNumberId: string;
  headers: Record<string, string>;
}

function normalizeRecipient(raw: string): string {
  return raw.replaceAll(/\D/g, "");
}

function normalizeMetaGraphVersion(raw: string): string {
  return raw.startsWith("v") ? raw : `v${raw}`;
}

function parseProviderMessageId(body: unknown): string | null {
  if (
    typeof body === "object" &&
    body !== null &&
    "messages" in body &&
    Array.isArray((body as { messages: unknown }).messages)
  ) {
    const first = (body as { messages: Array<{ id?: unknown }> }).messages[0];
    if (first && typeof first.id === "string") {
      return first.id;
    }
  }

  return null;
}

function parseMetaGraphError(
  body: unknown,
): { code: string; message: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  if (
    "error" in body &&
    typeof (body as { error: unknown }).error === "object" &&
    (body as { error: unknown }).error !== null
  ) {
    const errorObj = (
      body as {
        error: { code?: unknown; message?: unknown; type?: unknown };
      }
    ).error;
    const code =
      typeof errorObj.type === "string"
        ? errorObj.type
        : typeof errorObj.code === "number"
          ? String(errorObj.code)
          : "http_error";
    const message =
      typeof errorObj.message === "string"
        ? errorObj.message
        : "WhatsApp send failed";
    return { code, message: `WhatsApp send failed: ${message}` };
  }

  if (
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return {
      code: "http_error",
      message: `WhatsApp send failed: ${(body as { message: string }).message}`,
    };
  }

  return null;
}

function parseResponseBody(response: Response, text: string): unknown {
  const contentType = response.headers.get("content-type") ?? "";
  if (!text || !contentType.toLowerCase().includes("application/json")) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function sendMetaGraphWhatsAppText(
  config: MetaGraphWhatsAppConfig,
  input: { to: string; body: string },
): Promise<ProviderSendResult> {
  const to = normalizeRecipient(input.to);
  if (!to) {
    const failure: ProviderSendFailure = {
      provider: config.providerId,
      code: "invalid_recipient",
      statusCode: null,
      message: "Invalid WhatsApp recipient",
      retryable: false,
    };
    throw failure;
  }

  const version = normalizeMetaGraphVersion(config.apiVersion);
  const endpoint = `${config.baseUrl}/${version}/${config.phoneNumberId}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: input.body,
      },
    }),
  });

  const text = await response.text();
  const body = parseResponseBody(response, text);

  if (response.ok) {
    return { providerMessageId: parseProviderMessageId(body) };
  }

  const parsed = parseMetaGraphError(body);
  const failure: ProviderSendFailure = {
    provider: config.providerId,
    code: parsed?.code ?? "http_error",
    statusCode: response.status,
    message:
      parsed?.message ??
      `WhatsApp send failed (HTTP ${response.status}): ${text}`,
    retryable: response.status === 429 || response.status >= 500,
  };
  throw failure;
}
