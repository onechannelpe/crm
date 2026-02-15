import { createHmac } from "node:crypto";

export interface SignedRequest {
  signature: string;
  timestamp: string;
}

export function signRequest(
  body: string,
  secret: string,
  nowMs: number = Date.now(),
): SignedRequest {
  const timestamp = Math.floor(nowMs / 1000).toString();
  const timestampBytes = Buffer.alloc(8);
  timestampBytes.writeBigUInt64BE(BigInt(timestamp));

  const mac = createHmac("sha256", secret);
  mac.update(timestampBytes);
  mac.update(body);

  return { signature: mac.digest("hex"), timestamp };
}
