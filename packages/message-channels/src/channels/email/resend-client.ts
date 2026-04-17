interface ResendMailInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function parseResendError(body: unknown): string | undefined {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return undefined;
}

export async function sendWithResend(
  apiKey: string,
  input: ResendMailInput,
): Promise<void> {
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
    let message = `HTTP ${response.status}`;
    try {
      const body: unknown = await response.json();
      message = parseResendError(body) ?? message;
    } catch (parseError) {
      console.error("Failed to parse Resend error response", {
        status: response.status,
        parseError,
      });
    }
    throw new Error(`Resend send failed: ${message}`);
  }
}
