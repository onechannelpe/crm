"use server";

import { internalError, validationError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { searchEnrichmentService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

function assertDocumentType(value: string): "dni" | "ruc" {
  if (value === "dni" || value === "ruc") return value;
  throw validationError("Invalid enrichment document type");
}

function mapEnrichmentError(error: {
  reason: "invalid_document" | "unexpected";
  message: string;
}): never {
  if (error.reason === "invalid_document") {
    throw validationError(error.message);
  }
  throw internalError(error.message);
}

export async function requestSearchEnrichment(
  documentType: string,
  documentValue: string,
) {
  const session = await requirePermission("search:use");
  const result = await searchEnrichmentService.request(
    assertDocumentType(documentType),
    documentValue,
    session.userId,
  );
  if (isErr(result)) mapEnrichmentError(result.error);
  return result.value;
}

export async function getSearchEnrichmentStatus(
  documentType: string,
  documentValue: string,
) {
  await requirePermission("search:use");
  const result = await searchEnrichmentService.status(
    assertDocumentType(documentType),
    documentValue,
  );
  if (isErr(result)) mapEnrichmentError(result.error);
  return result.value;
}
