"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { normalizeEnrichmentInput } from "~/server/client-search/model";
import { serverRuntime } from "~/server/runtime";

export async function requestSearchEnrichment(
  documentType: string,
  documentValue: string,
) {
  const session = await requirePermission("search:use");
  const { enrichmentCommand } = serverRuntime.clientSearch;

  const normalized = normalizeEnrichmentInput({
    documentType,
    documentValue,
  });

  return enrichmentCommand.enqueueRequest(
    normalized.documentType,
    normalized.documentValue,
    session.userId,
  );
}

export async function getSearchEnrichmentStatus(
  documentType: string,
  documentValue: string,
) {
  await requirePermission("search:use");

  const normalized = normalizeEnrichmentInput({
    documentType,
    documentValue,
  });

  const { enrichmentQuery } = serverRuntime.clientSearch;
  return enrichmentQuery.getStatus(
    normalized.documentType,
    normalized.documentValue,
  );
}
