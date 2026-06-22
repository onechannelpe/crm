import { verifyWhatsAppSignature } from "./whatsapp-signature";

export interface WebhookVerifierInput {
  request: Request;
  rawBody: string;
}

export type WebhookVerifier = (input: WebhookVerifierInput) => boolean;

// Bounds body buffering before signature verification.
export const WEBHOOK_BODY_LIMIT_BYTES = 256 * 1024;

const VERIFIERS: Record<string, WebhookVerifier> = {
  "/api/webhooks/whatsapp": verifyWhatsAppSignature,
};

export function getWebhookVerifier(pathname: string): WebhookVerifier | null {
  return VERIFIERS[pathname] ?? null;
}
