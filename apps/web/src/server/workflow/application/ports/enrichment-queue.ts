export type LeadEnrichmentQueue = {
  enqueueRucVerification(ruc: string, requestedByUserId: number): Promise<void>;
};
