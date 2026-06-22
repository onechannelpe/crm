import { verifyWhatsAppSignature } from "./whatsapp-signature";

export interface WebhookVerifierInput {
  request: Request;
  rawBody: string;
}

// Returns true when the request is an authentic call from the provider. A
// verifier must be a pure transport check (signature over the body); stateful
// identity lookups belong in the route handler.
export type WebhookVerifier = (input: WebhookVerifierInput) => boolean;

// Provider payloads are a few KB. The cap bounds memory for unauthenticated
// callers, since the body is buffered before the signature is checked.
export const WEBHOOK_BODY_LIMIT_BYTES = 256 * 1024;

const VERIFIERS: Record<string, WebhookVerifier> = {
  "/api/webhooks/whatsapp": verifyWhatsAppSignature,
};

export function getWebhookVerifier(pathname: string): WebhookVerifier | null {
  return VERIFIERS[pathname] ?? null;
}
