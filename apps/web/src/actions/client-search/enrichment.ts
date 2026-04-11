"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { serverRuntime } from "~/server/runtime";

function assertEnrichmentDocumentType(value: string): "dni" | "ruc" {
  if (value === "dni" || value === "ruc") return value;
  throw new Error("Invalid document type");
}

export async function requestSearchEnrichment(
  documentType: string,
  documentValue: string,
) {
  const session = await requirePermission("search:use");
  const { enrichmentCommand } = serverRuntime.clientSearch;

  const safeDocumentType = assertEnrichmentDocumentType(documentType);

  return enrichmentCommand.enqueueRequest(
    safeDocumentType,
    documentValue,
    session.userId,
  );
}

export async function getSearchEnrichmentStatus(
  documentType: string,
  documentValue: string,
) {
  await requirePermission("search:use");

  const { enrichmentQuery } = serverRuntime.clientSearch;
  return enrichmentQuery.getStatus(
    assertEnrichmentDocumentType(documentType),
    documentValue,
  );
}
