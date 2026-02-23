"use server";

import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { repos, salesDocumentService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function addSaleDocument(
  noteId: number,
  filename: string,
  mimetype: string,
  contentBytes: Uint8Array | number[],
): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const safeFilename = assertNonEmptyString(filename, "filename");
  const safeMimetype = assertNonEmptyString(mimetype, "mimetype");
  const safeContentBytes = Array.isArray(contentBytes)
    ? Uint8Array.from(contentBytes)
    : contentBytes instanceof Uint8Array
      ? contentBytes
      : null;
  if (!safeContentBytes || safeContentBytes.byteLength === 0) {
    throw new Error("contentBytes must be a non-empty byte array");
  }
  const session = await requirePermission("sales:create");
  const note = await repos.chargeNotes.findById(safeNoteId);
  if (!note) throw new Error("Charge note not found");
  if (note.user_id !== session.userId) throw new Error("Forbidden");
  if (note.status !== "draft" && note.status !== "rejected") {
    throw new Error("Documents can only be edited for draft or rejected notes");
  }

  const upload = await salesDocumentService.upload({
    chargeNoteId: safeNoteId,
    userId: session.userId,
    originalName: safeFilename,
    mimeType: safeMimetype,
    contentBytes: safeContentBytes,
  });
  if (isErr(upload)) throw new Error(upload.error);
  return { success: true };
}

export async function removeSaleDocument(
  noteId: number,
  documentId: number,
): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const safeDocumentId = assertPositiveInt(documentId, "documentId");
  const session = await requirePermission("sales:create");
  const note = await repos.chargeNotes.findById(safeNoteId);
  if (!note) throw new Error("Charge note not found");
  if (note.user_id !== session.userId) throw new Error("Forbidden");
  if (note.status !== "draft" && note.status !== "rejected") {
    throw new Error("Documents can only be edited for draft or rejected notes");
  }

  const document = await repos.documents.findById(safeDocumentId);
  if (!document || document.charge_note_id !== safeNoteId) {
    throw new Error("Document not found");
  }

  const wasDeleted = await repos.documents.markSoftDeleted(
    safeDocumentId,
    session.userId,
  );
  if (!wasDeleted) throw new Error("Document is not available");
  return { success: true };
}
