import type { Document } from "~/domain/identity/document";
import type { OperationContext } from "~/server/platform/operation/context";

import type { CompanyRegistryPort } from "./ports";

export interface EnrichmentCommand {
  enqueueRequest(
    document: Document,
    requestedByUserId: string | null,
    operation: OperationContext,
  ): Promise<string>;
}

export function createEnrichmentCommand(
  repo: CompanyRegistryPort,
): EnrichmentCommand {
  return {
    enqueueRequest(document, requestedByUserId, operation) {
      return repo.upsertRequest({
        documentType: document.kind,
        documentValue: document.value,
        requestedByUserId,
        requestedAt: operation.operationAt,
        maxAttempts: 5,
      });
    },
  };
}
