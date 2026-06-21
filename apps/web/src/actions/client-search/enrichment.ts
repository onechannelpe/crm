"use server";

import { parseDocument } from "~/server/client-search/model";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { isErr, Ok } from "~/server/shared/result";

function parseEnrichmentTarget(input: unknown) {
  const shaped = parseObject(input, validationFail, (r) => ({
    documentType: r.str("documentType"),
    documentValue: r.str("documentValue"),
  }));
  if (isErr(shaped)) return shaped;

  return parseDocument(shaped.value.documentType, shaped.value.documentValue);
}

export async function requestSearchEnrichment(input: unknown) {
  return runAction({
    name: "client_search.enrichment.request",
    access: { kind: "permission", permission: "search:use" },

    parse: () => parseEnrichmentTarget(input),

    execute: async (ctx, target) => {
      const { enrichmentCommand } = getServerRuntime().clientSearch;
      const jobId = await enrichmentCommand.enqueueRequest(
        target.documentType,
        target.documentValue,
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

    parse: () => parseEnrichmentTarget(input),

    execute: async (_ctx, target) => {
      const { enrichmentQuery } = getServerRuntime().clientSearch;
      const status = await enrichmentQuery.getStatus(
        target.documentType,
        target.documentValue,
      );
      return Ok(status);
    },
  });
}
