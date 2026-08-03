import { invalid } from "~/domain/errors";
import { parseDocument } from "~/domain/identity/document";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
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
      const jobId = await application.clientSearch.requestEnrichment(
        document,
        ctx.actor.userId,
        ctx,
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
      const status = await application.clientSearch.getEnrichmentStatus(
        document,
        ctx,
      );
      return Ok(status);
    },
  });
}
