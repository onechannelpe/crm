import type { DeliveryProvider } from "../../types";
import type {
  ProviderSendFailure,
  ProviderSendResult,
} from "../provider-types";

interface ResendMailInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function parseResendError(body: unknown): {
  code: string;
  message: string;
} | null {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    const message = (body as { message: string }).message;
    const code =
      "name" in body && typeof (body as { name: unknown }).name === "string"
        ? (body as { name: string }).name
        : "resend_error";
    return { code, message };
  }
  return null;
}

export async function sendWithResend(
  apiKey: string,
  input: ResendMailInput,
): Promise<ProviderSendResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    let code = "http_error";
    let message = `HTTP ${response.status}`;
    try {
      const body: unknown = await response.json();
      const parsed = parseResendError(body);
      if (parsed) {
        code = parsed.code;
        message = parsed.message;
      }
    } catch (parseError) {
      console.error("Failed to parse Resend error response", {
        status: response.status,
        parseError,
      });
    }

    const failure: ProviderSendFailure = {
      provider: "resend",
      code,
      statusCode: response.status,
      message: `Resend send failed: ${message}`,
      retryable: response.status === 429 || response.status >= 500,
    };
    throw failure;
  }

  let providerMessageId: string | null = null;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "id" in body &&
      typeof (body as { id: unknown }).id === "string"
    ) {
      providerMessageId = (body as { id: string }).id;
    }
  } catch {
    providerMessageId = null;
  }

  return { providerMessageId };
}

export function createResendProvider(config: {
  apiKey: string;
  fromEmail: string;
}): DeliveryProvider<"email"> {
  return {
    id: "resend",
    channel: "email",
    send(input) {
      return sendWithResend(config.apiKey, {
        from: config.fromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    },
  };
}
