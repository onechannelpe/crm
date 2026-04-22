"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { getServerRuntime } from "~/server/runtime";

export async function requestSearchEnrichment(
  documentType: string,
  documentValue: string,
) {
  const session = await requirePermission("search:use");
  const { enrichmentCommand } = getServerRuntime().clientSearch;

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

  const { enrichmentQuery } = getServerRuntime().clientSearch;
  return enrichmentQuery.getStatus(documentType, documentValue);
}
