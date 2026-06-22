import { verifyWhatsAppSignature } from "./whatsapp-signature";

export interface WebhookVerifierInput {
  request: Request;
  rawBody: string;
}

export type WebhookVerifier = (input: WebhookVerifierInput) => boolean;

// Bounds body buffering before signature verification.
export const WEBHOOK_BODY_LIMIT_BYTES = 256 * 1024;

export type WebhookPolicy = {
  handshakeMethods: readonly string[];
  verify: WebhookVerifier;
};

const WEBHOOK_POLICIES: Record<string, WebhookPolicy> = {
  "/api/webhooks/whatsapp": {
    handshakeMethods: ["GET"],
    verify: verifyWhatsAppSignature,
  },
};

export function getWebhookPolicy(pathname: string): WebhookPolicy | null {
  return WEBHOOK_POLICIES[pathname] ?? null;
}
