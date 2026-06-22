import type { DeliveryProvider } from "../../types";
import type {
  ProviderSendFailure,
  ProviderSendResult,
} from "../provider-types";

interface SendKapsoWhatsAppTextInput {
  apiKey: string;
  phoneNumberId: string;
  metaGraphVersion: string;
  to: string;
  body: string;
}

const KAPSO_META_BASE_URL = "https://api.kapso.ai/meta/whatsapp";

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

function parseKapsoError(
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
          : "kapso_error";
    const message =
      typeof errorObj.message === "string" ? errorObj.message : "Kapso error";
    return { code, message: `Kapso WhatsApp send failed: ${message}` };
  }

  if (
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return {
      code: "kapso_error",
      message: `Kapso WhatsApp send failed: ${(body as { message: string }).message}`,
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

export async function sendWithKapsoWhatsAppText(
  input: SendKapsoWhatsAppTextInput,
): Promise<ProviderSendResult> {
  const to = normalizeRecipient(input.to);
  if (!to) {
    const failure: ProviderSendFailure = {
      provider: "kapso",
      code: "invalid_recipient",
      statusCode: null,
      message: "Invalid WhatsApp recipient",
      retryable: false,
    };
    throw failure;
  }

  const graphVersion = normalizeMetaGraphVersion(input.metaGraphVersion);
  const endpoint = `${KAPSO_META_BASE_URL}/${graphVersion}/${input.phoneNumberId}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": input.apiKey,
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

  const parsed = parseKapsoError(body);
  const failure: ProviderSendFailure = {
    provider: "kapso",
    code: parsed?.code ?? "http_error",
    statusCode: response.status,
    message:
      parsed?.message ??
      `Kapso WhatsApp send failed (HTTP ${response.status}): ${text}`,
    retryable: response.status === 429 || response.status >= 500,
  };
  throw failure;
}

export function createKapsoProvider(config: {
  apiKey: string;
  phoneNumberId: string;
  metaGraphVersion: string;
}): DeliveryProvider<"whatsapp"> {
  return {
    id: "kapso",
    channel: "whatsapp",
    send(input) {
      return sendWithKapsoWhatsAppText({
        apiKey: config.apiKey,
        phoneNumberId: config.phoneNumberId,
        metaGraphVersion: config.metaGraphVersion,
        to: input.to,
        body: input.body,
      });
    },
  };
}
