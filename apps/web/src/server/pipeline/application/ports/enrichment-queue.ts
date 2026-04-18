import type { UserId } from "~/server/shared/ids";

export type LeadEnrichmentQueue = {
  enqueueRucVerification(ruc: string, requestedByUserId: UserId): Promise<void>;
};
