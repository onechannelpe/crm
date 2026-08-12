import { invalid } from "~/domain/errors";
import { parseDocument } from "~/domain/identity/document";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { Err, Ok } from "~/shared/result";
import { isPlainRecord } from "~/shared/type-guards";

export async function requestSearchEnrichment(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "client_search.enrichment.request",
    access: { kind: "permission", permission: "search:use" },

    parse: () => {
      if (!isPlainRecord(input)) {
        return Err(invalid({ code: "invalid_document_type" }));
      }

      return parseDocument(input.documentType, input.documentValue);
    },

    execute: async (ctx, document) => {
      const jobId = await getApplication().clientSearch.requestEnrichment(
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

    parse: () => parseDocument(documentType, documentValue),

    execute: async (ctx, document) => {
      const status = await getApplication().clientSearch.getEnrichmentStatus(
        document,
        ctx,
      );

      return Ok(status);
    },
  });
}
