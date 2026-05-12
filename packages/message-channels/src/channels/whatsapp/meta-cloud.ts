import type {
  ProviderSendFailure,
  ProviderSendResult,
} from "../provider-types";

interface SendWhatsAppTextInput {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  to: string;
  body: string;
}

function normalizeRecipient(raw: string): string {
  const digits = raw.replaceAll(/\D/g, "");
  if (/^9\d{8}$/.test(digits)) {
    return `51${digits}`;
  }
  return digits;
}

export async function sendWithWhatsAppCloudText(
  input: SendWhatsAppTextInput,
): Promise<ProviderSendResult> {
  const to = normalizeRecipient(input.to);
  if (!to) {
    const failure: ProviderSendFailure = {
      provider: "whatsapp_cloud",
      code: "invalid_recipient",
      statusCode: null,
      message: "Invalid WhatsApp recipient",
      retryable: false,
    };
    throw failure;
  }

  const endpoint = `https://graph.facebook.com/${input.apiVersion}/${input.phoneNumberId}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
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

  if (response.ok) {
    let providerMessageId: string | null = null;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "messages" in body &&
        Array.isArray((body as { messages: unknown }).messages)
      ) {
        const first = (body as { messages: Array<{ id?: unknown }> })
          .messages[0];
        if (first && typeof first.id === "string") {
          providerMessageId = first.id;
        }
      }
    } catch {
      providerMessageId = null;
    }
    return { providerMessageId };
  }

  let code = "http_error";
  let message = `WhatsApp send failed (HTTP ${response.status})`;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "object" &&
      (body as { error: unknown }).error !== null
    ) {
      const errorObj = (
        body as {
          error: { code?: unknown; message?: unknown; type?: unknown };
        }
      ).error;
      if (typeof errorObj.code === "number") {
        code = String(errorObj.code);
      }
      if (typeof errorObj.type === "string") {
        code = errorObj.type;
      }
      if (typeof errorObj.message === "string") {
        message = `WhatsApp send failed: ${errorObj.message}`;
      }
    }
  } catch {
    const details = await response.text();
    message = `WhatsApp send failed (HTTP ${response.status}): ${details}`;
  }

  const failure: ProviderSendFailure = {
    provider: "whatsapp_cloud",
    code,
    statusCode: response.status,
    message,
    retryable: response.status === 429 || response.status >= 500,
  };
  throw failure;
}
