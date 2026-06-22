import { createHmac, timingSafeEqual } from "node:crypto";

import { notificationsConfig } from "~/lib/env";

import type { WebhookVerifierInput } from "./registry";

// Kapso signs outbound webhook requests with HMAC-SHA256 over the raw request
// body and sends the digest as a hex string in `X-Webhook-Signature`. The
// secret is the same `secret_key` returned when the webhook was created.
//
// Signature verification must run over the exact bytes received (before JSON
// parsing), so this takes the raw body rather than parsed JSON.
export function verifyKapsoSignature({
  request,
  rawBody,
}: WebhookVerifierInput): boolean {
  const signature = request.headers.get("x-webhook-signature");
  if (!signature) return false;

  const { kapsoWebhookSecret } = notificationsConfig();
  if (!kapsoWebhookSecret) return false;

  const expected = createHmac("sha256", kapsoWebhookSecret)
    .update(rawBody)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
