import { createHash } from "node:crypto";

// Bytes, not decoded rows, identify a report so decoder changes remain replayable.
export function contentSha256(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return createHash("sha256").update(view).digest("hex");
}
