"use server";

import { serverRuntime } from "~/server/runtime";

export async function requestSearchEnrichment(
  documentType: string,
  documentValue: string,
) {
  const session = await (
    await import("~/lib/auth/access/session")
  ).requirePermission("search:use");
  const { enrichmentCommand } = serverRuntime.clientSearch;

  // Validate document type
  if (documentType !== "dni" && documentType !== "ruc") {
    throw new Error("Invalid document type");
  }

  await enrichmentCommand.enqueueRequest(
    documentType,
    documentValue,
    session.userId,
  );

  // Return status after enqueue
  const { enrichmentQuery } = serverRuntime.clientSearch;
  return enrichmentQuery.getStatus(documentType, documentValue);
}

export async function getSearchEnrichmentStatus(
  documentType: string,
  documentValue: string,
) {
  await (
    await import("~/lib/auth/access/session")
  ).requirePermission("search:use");

  if (documentType !== "dni" && documentType !== "ruc") {
    throw new Error("Invalid document type");
  }

  const { enrichmentQuery } = serverRuntime.clientSearch;
  return enrichmentQuery.getStatus(documentType, documentValue);
}
