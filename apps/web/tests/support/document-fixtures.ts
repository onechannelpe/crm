import { expect } from "vitest";

import type { TestDbContext } from "./test-db";
import { drainDocumentJobs } from "./test-db";

export const PDF_BYTES = Uint8Array.from([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37,
]);

export async function uploadTestPdf(
  ctx: TestDbContext,
  noteId: number,
  userId = 1,
) {
  const result = await ctx.documents.upload({
    chargeNoteId: noteId,
    userId,
    originalName: "dni.pdf",
    mimeType: "application/pdf",
    contentBytes: PDF_BYTES,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("Expected document upload to succeed");
  }
  await drainDocumentJobs(ctx);
  return result.value.documentId;
}
