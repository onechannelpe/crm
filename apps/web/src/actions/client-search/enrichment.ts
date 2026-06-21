"use server";

import { isPlainRecord } from "~/lib/type-guards";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseDocument } from "~/server/shared/document";
import { invalid } from "~/server/shared/domain-error";
import { Err, Ok } from "~/server/shared/result";

function parseDocumentInput(input: unknown) {
  if (!isPlainRecord(input)) {
    return Err(invalid({ code: "invalid_document_type" }));
  }
  return parseDocument(input.documentType, input.documentValue);
}

export async function requestSearchEnrichment(input: unknown) {
  return runAction({
    name: "client_search.enrichment.request",
    access: { kind: "permission", permission: "search:use" },

    parse: () => parseDocumentInput(input),

    execute: async (ctx, document) => {
      const { enrichmentCommand } = getServerRuntime().clientSearch;
      const jobId = await enrichmentCommand.enqueueRequest(
        document,
        ctx.actor.userId,
      );
      return Ok(jobId);
    },
  });
}

export async function getSearchEnrichmentStatus(input: unknown) {
  return runAction({
    name: "client_search.enrichment.status.read",
    access: { kind: "permission", permission: "search:use" },

    parse: () => parseDocumentInput(input),

    execute: async (_ctx, document) => {
      const { enrichmentQuery } = getServerRuntime().clientSearch;
      const status = await enrichmentQuery.getStatus(document);
      return Ok(status);
    },
  });
}
