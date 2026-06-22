import { createHmac, timingSafeEqual } from "node:crypto";

import { notificationsConfig } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";

import type { WebhookVerifierInput } from "./registry";

const logger = createLogger("whatsapp-webhook");

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
  const { kapsoWebhookSecret } = notificationsConfig();

  if (!signature) {
    logger.warn("kapso_signature_missing_header");
    return false;
  }
  if (!kapsoWebhookSecret) {
    logger.warn("kapso_signature_no_env_secret");
    return false;
  }

  const expected = createHmac("sha256", kapsoWebhookSecret)
    .update(rawBody)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== actualBuf.length) {
    logger.warn("kapso_signature_length_mismatch", {
      actualPrefix: signature.slice(0, 8),
      actualLength: actualBuf.length,
      expectedLength: expectedBuf.length,
      bodyLength: rawBody.length,
    });
    return false;
  }

  if (!timingSafeEqual(expectedBuf, actualBuf)) {
    logger.warn("kapso_signature_mismatch", {
      actualPrefix: signature.slice(0, 8),
      expectedPrefix: expected.slice(0, 8),
      bodyLength: rawBody.length,
    });
    return false;
  }

  return true;
}
