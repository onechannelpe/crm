import { invalid } from "~/domain/errors";
import { parseDocument } from "~/domain/identity/document";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import { Err, Ok } from "~/shared/result";
import { isPlainRecord } from "~/shared/type-guards";

function parseDocumentInput(input: unknown) {
  if (!isPlainRecord(input)) {
    return Err(invalid({ code: "invalid_document_type" }));
  }
  return parseDocument(input.documentType, input.documentValue);
}

export async function requestSearchEnrichment(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "client_search.enrichment.request",
    access: { kind: "permission", permission: "search:use" },

    parse: () => parseDocumentInput(input),

    execute: async (ctx, document) => {
      const { enrichmentCommand } = application.clientSearch;
      const jobId = await enrichmentCommand.enqueueRequest(
        document,
        ctx.actor.userId,
        ctx.operationAt,
      );
      return Ok(jobId);
    },
  });
}

export async function getSearchEnrichmentStatus(
  documentType: unknown,
  documentValue: unknown,
) {
  "use server";

  return executeSessionServerFunction({
    name: "client_search.enrichment.status.read",
    access: { kind: "permission", permission: "search:use" },

    parse: () => parseDocumentInput({ documentType, documentValue }),

    execute: async (ctx, document) => {
      const { enrichmentQuery } = application.clientSearch;
      const status = await enrichmentQuery.getStatus(document, ctx.operationAt);
      return Ok(status);
    },
  });
}
