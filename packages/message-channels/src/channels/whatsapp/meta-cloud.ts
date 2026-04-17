interface SendWhatsAppTextInput {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  to: string;
  body: string;
}

function normalizeRecipient(raw: string): string {
  return raw.replaceAll(/[^+\d]/g, "");
}

export async function sendWithWhatsAppCloudText(
  input: SendWhatsAppTextInput,
): Promise<void> {
  const to = normalizeRecipient(input.to);
  if (!to) {
    throw new Error("Invalid WhatsApp recipient");
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
    return;
  }

  const details = await response.text();
  throw new Error(`WhatsApp send failed (${response.status}): ${details}`);
}
