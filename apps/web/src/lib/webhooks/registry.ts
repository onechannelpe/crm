import { verifyKapsoSignature } from "./kapso-signature";

export interface WebhookVerifierInput {
  request: Request;
  rawBody: string;
}

export type WebhookVerifier = (input: WebhookVerifierInput) => boolean;

// 256 KiB caps the buffered body so signature verification runs over the
// complete payload, not a stream chunk.
export const WEBHOOK_BODY_LIMIT_BYTES = 256 * 1024;

export type WebhookPolicy = {
  handshakeMethods: readonly string[];
  verify: WebhookVerifier;
};

const WEBHOOK_POLICIES: Record<string, WebhookPolicy> = {
  "/api/webhooks/whatsapp": {
    handshakeMethods: ["GET"],
    verify: verifyKapsoSignature,
  },
};

export function getWebhookPolicy(pathname: string): WebhookPolicy | null {
  return WEBHOOK_POLICIES[pathname] ?? null;
}
