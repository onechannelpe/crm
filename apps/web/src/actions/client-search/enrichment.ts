"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok, type Result } from "~/server/shared/result";

type EnrichmentTarget = {
  documentType: string;
  documentValue: string;
};

function parseEnrichmentTarget(
  rawDocumentType: unknown,
  rawDocumentValue: unknown,
): Result<EnrichmentTarget, DomainError> {
  return parseObject(
    { documentType: rawDocumentType, documentValue: rawDocumentValue },
    validationFail,
    (r) => ({
      documentType: r.str("documentType"),
      documentValue: r.str("documentValue"),
    }),
  );
}

export async function requestSearchEnrichment(
  rawDocumentType: unknown,
  rawDocumentValue: unknown,
) {
  return runAction({
    name: "client_search.enrichment.request",
    access: { kind: "permission", permission: "search:use" },
    parse: () => parseEnrichmentTarget(rawDocumentType, rawDocumentValue),

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

export async function getSearchEnrichmentStatus(
  rawDocumentType: unknown,
  rawDocumentValue: unknown,
) {
  return runAction({
    name: "client_search.enrichment.status.read",
    access: { kind: "permission", permission: "search:use" },
    parse: () => parseEnrichmentTarget(rawDocumentType, rawDocumentValue),

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
