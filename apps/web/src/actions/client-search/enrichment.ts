"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { serverRuntime } from "~/server/runtime";

export async function requestSearchEnrichment(
  documentType: string,
  documentValue: string,
) {
  const session = await requirePermission("search:use");
  const { enrichmentCommand } = serverRuntime.clientSearch;

  return enrichmentCommand.enqueueRequest(
    documentType,
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
  return enrichmentQuery.getStatus(documentType, documentValue);
}
