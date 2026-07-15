import { createHash } from "node:crypto";

// The identity of an upload: two uploads of the same bytes are the same report,
// however the file was named and whoever sent it.
//
// Hashed from the bytes rather than from the decoded rows, so the identity holds
// across decoder changes and a duplicate can be rejected at the boundary, before
// anything is stored or enqueued.
export function contentSha256(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return createHash("sha256").update(view).digest("hex");
}
