import { createHmac, timingSafeEqual } from "node:crypto";

import { notificationsConfig } from "~/lib/env";

import type { WebhookVerifierInput } from "./registry";

// Meta signs the raw request body with the app secret (HMAC-SHA256) and sends
// it as `sha256=<hex>` in X-Hub-Signature-256. Verification must run over the
// exact bytes received, so it takes the raw body rather than parsed JSON.
export function verifyWhatsAppSignature({
  request,
  rawBody,
}: WebhookVerifierInput): boolean {
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const { whatsappAppSecret } = notificationsConfig();
  const expected = createHmac("sha256", whatsappAppSecret)
    .update(rawBody)
    .digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
