import { createHmac } from "node:crypto";

export interface SignedRequest {
  signature: string;
  timestamp: string;
}

/**
 * `nowMs` is the moment the request is sent, not the instant of the operation
 * that triggered it. Engine validates it against a skew window, so it must be
 * read at the send boundary rather than inherited.
 */
export function signRequest(
  body: string,
  secret: string,
  nowMs: number,
): SignedRequest {
  const timestamp = Math.floor(nowMs / 1000).toString();
  const timestampBytes = Buffer.alloc(8);
  timestampBytes.writeBigUInt64BE(BigInt(timestamp));

  const mac = createHmac("sha256", secret);
  mac.update(timestampBytes);
  mac.update(body);

  return { signature: mac.digest("hex"), timestamp };
}
